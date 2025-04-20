import { 
  Horizon, 
  Networks, 
  Asset, 
  TransactionBuilder, 
  Operation, 
  BASE_FEE,
  xdr
} from '@stellar/stellar-sdk';
import * as freighterApi from "@stellar/freighter-api";
import { supabase } from "@/integrations/supabase/client";

// Initialize the Stellar SDK with the Testnet network
export const server = new Horizon.Server("https://horizon-testnet.stellar.org");
export const networkPassphrase = Networks.TESTNET;

// Interface for a payment agreement
export interface PaymentAgreement {
  id: string;
  sender: string;
  recipient: string;
  asset: {
    code: string;
    issuer?: string;
  };
  amount: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  cyclesTotal: number | null; // null means indefinite
  cyclesCompleted: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  nextPaymentDate: Date;
  lastPaymentDate: Date | null;
}

// Check if Freighter is installed
export const isFreighterInstalled = async (): Promise<boolean> => {
  console.log("Checking if Freighter is installed...");
  const result = await freighterApi.isConnected();
  console.log(`Freighter installed: ${result}`);
  return result;
};

// Get the user's public key
export const getPublicKey = async (): Promise<string> => {
  console.log("Getting public key from Freighter...");
  if (await isFreighterInstalled()) {
    const publicKey = await freighterApi.getPublicKey();
    console.log(`Public key retrieved: ${publicKey.substring(0, 10)}...`);
    return publicKey;
  }
  console.error("Freighter is not installed");
  throw new Error("Freighter is not installed");
};

// Get the network that Freighter is connected to
export const getNetwork = async (): Promise<string> => {
  console.log("Getting network from Freighter...");
  if (await isFreighterInstalled()) {
    const network = await freighterApi.getNetwork();
    console.log(`Connected to network: ${network}`);
    return network;
  }
  console.error("Freighter is not installed");
  throw new Error("Freighter is not installed");
};

// Sign a transaction with Freighter
export const signTransaction = async (xdr: string): Promise<string> => {
  console.log("Signing transaction with Freighter...");
  if (await isFreighterInstalled()) {
    const signedXdr = await freighterApi.signTransaction(xdr, { networkPassphrase });
    console.log("Transaction signed successfully");
    return signedXdr;
  }
  console.error("Freighter is not installed");
  throw new Error("Freighter is not installed");
};

// Fetch account details including balances
export const getAccountDetails = async (publicKey: string) => {
  try {
    console.log(`Fetching account details for: ${publicKey.substring(0, 10)}...`);
    const account = await server.loadAccount(publicKey);
    console.log("Account details retrieved successfully");
    return account;
  } catch (error) {
    console.error("Error fetching account details:", error);
    throw error;
  }
};

// Create a payment transaction
export const createPaymentTransaction = async (
  sourcePublicKey: string,
  destinationPublicKey: string,
  amount: string,
  asset: { code: string; issuer?: string }
) => {
  try {
    console.log(`Creating payment transaction: ${amount} ${asset.code} to ${destinationPublicKey.substring(0, 10)}...`);
    const sourceAccount = await server.loadAccount(sourcePublicKey);
    
    let assetInstance;
    if (asset.code === "XLM") {
      assetInstance = Asset.native();
    } else if (asset.code && asset.issuer) {
      assetInstance = new Asset(asset.code, asset.issuer);
    } else {
      throw new Error("Invalid asset");
    }

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: destinationPublicKey,
          asset: assetInstance,
          amount,
        })
      )
      .setTimeout(30)
      .build();

    console.log("Payment transaction created successfully");
    return transaction.toXDR();
  } catch (error) {
    console.error("Error creating payment transaction:", error);
    throw error;
  }
};

// Submit a signed transaction
export const submitTransaction = async (signedXdr: string) => {
  try {
    console.log("Submitting transaction to Stellar network...");
    const transaction = TransactionBuilder.fromXDR(
      signedXdr,
      networkPassphrase
    );
    const transactionResult = await server.submitTransaction(transaction);
    console.log("Transaction submitted successfully:", transactionResult.hash);
    return transactionResult;
  } catch (error) {
    console.error("Error submitting transaction:", error);
    throw error;
  }
};

// Create an agreement and store it in Supabase
export const createAgreement = async (
  senderPublicKey: string,
  recipientPublicKey: string,
  asset: { code: string; issuer?: string },
  amount: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  startDate: Date,
  cycles: number | null
): Promise<PaymentAgreement> => {
  console.log("Creating new payment agreement in database...");
  const nextPaymentDate = new Date(startDate);
  
  // Convert agreement data for Supabase storage
  const agreementData = {
    user_id: senderPublicKey,
    recipient: recipientPublicKey,
    amount: amount,
    asset_code: asset.code,
    asset_issuer: asset.issuer,
    frequency: frequency,
    start_date: startDate.toISOString(),
    indefinite: cycles === null,
    cycles: cycles,
    cycles_completed: 0,
    status: 'active',
    next_payment_date: nextPaymentDate.toISOString(),
    last_payment_date: null
  };
  
  try {
    const { data, error } = await supabase
      .from('payment_agreements')
      .insert(agreementData)
      .select()
      .single();
    
    if (error) {
      console.error("Error saving agreement to database:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      console.error("No data returned after inserting agreement");
      throw new Error("Failed to create agreement: No data returned");
    }
    
    console.log("Agreement created successfully with ID:", data.id);
    
    // Convert database record to PaymentAgreement format
    return {
      id: data.id,
      sender: data.user_id,
      recipient: data.recipient,
      asset: {
        code: data.asset_code,
        issuer: data.asset_issuer,
      },
      amount: data.amount,
      frequency: data.frequency as 'daily' | 'weekly' | 'monthly',
      startDate: new Date(data.start_date),
      cyclesTotal: data.indefinite ? null : data.cycles,
      cyclesCompleted: data.cycles_completed,
      status: data.status as 'active' | 'paused' | 'completed' | 'cancelled',
      nextPaymentDate: new Date(data.next_payment_date),
      lastPaymentDate: data.last_payment_date ? new Date(data.last_payment_date) : null,
    };
  } catch (error) {
    console.error("Error creating agreement:", error);
    throw error;
  }
};

// Get agreements from Supabase
export const getAgreements = async (publicKey: string): Promise<PaymentAgreement[]> => {
  console.log(`Fetching agreements for user: ${publicKey.substring(0, 10)}...`);
  
  const { data, error } = await supabase
    .from('payment_agreements')
    .select('*')
    .eq('user_id', publicKey);
  
  if (error) {
    console.error("Error fetching agreements from database:", error);
    throw error;
  }
  
  console.log(`Retrieved ${data.length} agreement(s) from database`);
  
  // Convert database records to PaymentAgreement format
  return data.map(record => ({
    id: record.id,
    sender: record.user_id,
    recipient: record.recipient,
    asset: {
      code: record.asset_code,
      issuer: record.asset_issuer,
    },
    amount: record.amount,
    frequency: record.frequency as 'daily' | 'weekly' | 'monthly',
    startDate: new Date(record.start_date),
    cyclesTotal: record.indefinite ? null : record.cycles,
    cyclesCompleted: record.cycles_completed,
    status: record.status as 'active' | 'paused' | 'completed' | 'cancelled',
    nextPaymentDate: new Date(record.next_payment_date),
    lastPaymentDate: record.last_payment_date ? new Date(record.last_payment_date) : null,
  }));
};

export const executePayment = async (agreementId: string): Promise<boolean> => {
  console.log(`Executing payment for agreement: ${agreementId}`);
  
  // Fetch the agreement from Supabase
  const { data: agreement, error: fetchError } = await supabase
    .from('payment_agreements')
    .select('*')
    .eq('id', agreementId)
    .single();
  
  if (fetchError || !agreement) {
    console.error("Error fetching agreement from database:", fetchError);
    throw new Error("Agreement not found");
  }
  
  if (agreement.status !== 'active') {
    console.error(`Agreement is ${agreement.status}`);
    throw new Error(`Agreement is ${agreement.status}`);
  }
  
  const now = new Date();
  if (now < new Date(agreement.next_payment_date)) {
    console.error("Payment is not due yet");
    throw new Error("Payment is not due yet");
  }
  
  try {
    // Create and sign a payment transaction
    const xdr = await createPaymentTransaction(
      agreement.user_id,
      agreement.recipient,
      agreement.amount,
      {
        code: agreement.asset_code,
        issuer: agreement.asset_issuer,
      }
    );
    
    const signedXdr = await signTransaction(xdr);
    const result = await submitTransaction(signedXdr);
    
    if (result) {
      console.log("Payment executed successfully, updating agreement");
      
      // Calculate next payment date
      const nextDate = new Date(agreement.next_payment_date);
      switch (agreement.frequency) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }
      
      const cycles_completed = agreement.cycles_completed + 1;
      const status = agreement.cycles && cycles_completed >= agreement.cycles ? 'completed' : 'active';
      
      // Update agreement in Supabase
      const { error: updateError } = await supabase
        .from('payment_agreements')
        .update({
          cycles_completed,
          status,
          next_payment_date: nextDate.toISOString(),
          last_payment_date: now.toISOString(),
        })
        .eq('id', agreementId);
      
      if (updateError) {
        console.error("Error updating agreement in database:", updateError);
        throw updateError;
      }
      
      console.log("Agreement updated successfully");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error executing payment:", error);
    throw error;
  }
};

export const updateAgreementStatus = async (
  agreementId: string,
  status: 'active' | 'paused' | 'cancelled'
): Promise<PaymentAgreement> => {
  console.log(`Updating agreement ${agreementId} status to: ${status}`);
  
  // Update status in Supabase
  const { data, error } = await supabase
    .from('payment_agreements')
    .update({ status })
    .eq('id', agreementId)
    .select()
    .single();
  
  if (error) {
    console.error("Error updating agreement status:", error);
    throw error;
  }
  
  console.log("Agreement status updated successfully");
  
  // Convert database record to PaymentAgreement format
  return {
    id: data.id,
    sender: data.user_id,
    recipient: data.recipient,
    asset: {
      code: data.asset_code,
      issuer: data.asset_issuer,
    },
    amount: data.amount,
    frequency: data.frequency as 'daily' | 'weekly' | 'monthly',
    startDate: new Date(data.start_date),
    cyclesTotal: data.indefinite ? null : data.cycles,
    cyclesCompleted: data.cycles_completed,
    status: data.status as 'active' | 'paused' | 'completed' | 'cancelled',
    nextPaymentDate: new Date(data.next_payment_date),
    lastPaymentDate: data.last_payment_date ? new Date(data.last_payment_date) : null,
  };
};
