#![allow(non_snake_case)]
#![no_std]
use soroban_sdk::{contract, contracttype, contractimpl, log, Env, Symbol, String, Address, Vec, symbol_short};

// Define the frequency of payments
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum BillingFrequency {
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
    Custom(u64), // Custom frequency in seconds
}

// Define the status of a subscription
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    Paused,
    Cancelled,
    Expired,
    Trial,
}

// Structure to store subscription details
#[contracttype]
#[derive(Clone)]
pub struct Subscription {
    pub subscription_id: u64,
    pub subscriber: Address,
    pub provider: Address,
    pub amount: u128,
    pub frequency: BillingFrequency,
    pub start_time: u64,
    pub next_billing: u64,
    pub end_time: u64, // 0 means no end time (ongoing subscription)
    pub status: SubscriptionStatus,
    pub description: String,
    pub last_payment: u64,
    pub payment_count: u64,
}

// Mapping subscription ID to Subscription
#[contracttype]
pub enum SubscriptionBook {
    Subscription(u64)
}

// Structure to track all subscriptions in the system
#[contracttype]
#[derive(Clone)]
pub struct SubscriptionStats {
    pub total: u64,
    pub active: u64,
    pub paused: u64,
    pub cancelled: u64,
    pub expired: u64,
    pub trial: u64,
}

// Structure to store payment records
#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub payment_id: u64,
    pub subscription_id: u64,
    pub amount: u128,
    pub timestamp: u64,
    pub status: bool, // true if payment was successful
}

// Mapping payment ID to Payment
#[contracttype]
pub enum PaymentBook {
    Payment(u64)
}

// Structure to store invoice details
#[contracttype]
#[derive(Clone)]
pub struct Invoice {
    pub invoice_id: u64,
    pub subscription_id: u64,
    pub amount: u128,
    pub issued_time: u64,
    pub due_time: u64,
    pub status: bool, // true if paid
}

// Mapping invoice ID to Invoice
#[contracttype]
pub enum InvoiceBook {
    Invoice(u64)
}

// Keys for storage
const SUBSCRIPTION_COUNT: Symbol = symbol_short!("SUB_COUNT");
const PAYMENT_COUNT: Symbol = symbol_short!("PAY_COUNT");
const INVOICE_COUNT: Symbol = symbol_short!("INV_COUNT");
const SUBSCRIPTION_STATS: Symbol = symbol_short!("SUB_STATS");

// List of subscriptions for a subscriber/provider
#[contracttype]
pub enum UserSubscriptions {
    Subscriber(Address),
    Provider(Address),
}

#[contract]
pub struct AutoBillingContract;

#[contractimpl]
impl AutoBillingContract {
    // Create a new subscription
    pub fn create_subscription(
        env: Env,
        subscriber: Address,
        provider: Address,
        amount: u128,
        frequency: BillingFrequency,
        start_time: u64,
        duration: u64, // duration in seconds, 0 for indefinite
        description: String,
        is_trial: bool,
    ) -> u64 {
        // Ensure both subscriber and provider authenticate this transaction
        subscriber.require_auth();
        
        // Get the current subscription count and increment it
        let mut sub_count: u64 = env.storage().instance().get(&SUBSCRIPTION_COUNT).unwrap_or(0);
        sub_count += 1;
        
        // Calculate end_time if duration is provided
        let end_time = if duration > 0 { start_time + duration } else { 0 };
        
        // Determine the next billing time based on frequency
        let next_billing = Self::calculate_next_billing(start_time, frequency.clone());
        
        // Create the subscription status
        let status = if is_trial { SubscriptionStatus::Trial } else { SubscriptionStatus::Active };
        
        // Create a new subscription
        let subscription = Subscription {
            subscription_id: sub_count,
            subscriber: subscriber.clone(),
            provider: provider.clone(),
            amount,
            frequency,
            start_time,
            next_billing,
            end_time,
            status,
            description,
            last_payment: 0, // No payment made yet
            payment_count: 0,
        };
        
        // Save the subscription
        env.storage().instance().set(
            &SubscriptionBook::Subscription(sub_count), 
            &subscription
        );
        
        // Update subscription stats
        let mut stats = Self::get_subscription_stats(env.clone());
        stats.total += 1;
        if is_trial {
            stats.trial += 1;
        } else {
            stats.active += 1;
        }
        env.storage().instance().set(&SUBSCRIPTION_STATS, &stats);
        
        // Update subscription count
        env.storage().instance().set(&SUBSCRIPTION_COUNT, &sub_count);
        
        // Update user subscription lists
        Self::add_to_user_subscriptions(env.clone(), subscriber.clone(), sub_count, true);
        Self::add_to_user_subscriptions(env.clone(), provider.clone(), sub_count, false);
        
        // Extend the storage TTL
        env.storage().instance().extend_ttl(10000, 10000);
        
        log!(&env, "Subscription created with ID: {}", sub_count);
        
        // Return the subscription ID
        sub_count
    }
    
    // Helper function to calculate the next billing date
    fn calculate_next_billing(current_time: u64, frequency: BillingFrequency) -> u64 {
        match frequency {
            BillingFrequency::Daily => current_time + 86400,
            BillingFrequency::Weekly => current_time + 604800,
            BillingFrequency::Monthly => current_time + 2592000,
            BillingFrequency::Quarterly => current_time + 7776000,
            BillingFrequency::Yearly => current_time + 31536000,
            BillingFrequency::Custom(seconds) => current_time + seconds,
        }
    }
    
    // Helper function to add a subscription to a user's list
    fn add_to_user_subscriptions(env: Env, user: Address, subscription_id: u64, is_subscriber: bool) {
        let key = if is_subscriber {
            UserSubscriptions::Subscriber(user)
        } else {
            UserSubscriptions::Provider(user)
        };
        
        let mut subscriptions: Vec<u64> = env.storage().instance().get(&key).unwrap_or(Vec::new(&env));
        subscriptions.push_back(subscription_id);
        env.storage().instance().set(&key, &subscriptions);
    }
    
    // Process a payment for a subscription
    pub fn process_payment(env: Env, subscription_id: u64) -> u64 {
        // Get the subscription
        let key = SubscriptionBook::Subscription(subscription_id);
        let mut subscription: Subscription = env.storage().instance().get(&key)
            .expect("Subscription not found");
        
        // Check if the subscription is active
        if subscription.status != SubscriptionStatus::Active && 
           subscription.status != SubscriptionStatus::Trial {
            log!(&env, "Cannot process payment for inactive subscription");
            panic!("Cannot process payment for inactive subscription");
        }
        
        // Check if it's time to bill
        let current_time = env.ledger().timestamp();
        if current_time < subscription.next_billing {
            log!(&env, "Not yet time for billing");
            panic!("Not yet time for billing");
        }
        
        // Require authentication from provider
        subscription.provider.require_auth();
        
        // Get the current payment count and increment it
        let mut payment_count: u64 = env.storage().instance().get(&PAYMENT_COUNT).unwrap_or(0);
        payment_count += 1;
        
        // Create payment record
        let payment = Payment {
            payment_id: payment_count,
            subscription_id,
            amount: subscription.amount,
            timestamp: current_time,
            status: true, // Assuming payment is successful
        };
        
        // Save the payment
        env.storage().instance().set(
            &PaymentBook::Payment(payment_count), 
            &payment
        );
        
        // Update subscription data
        subscription.last_payment = current_time;
        subscription.payment_count += 1;
        subscription.next_billing = Self::calculate_next_billing(
            current_time, 
            subscription.frequency.clone()
        );
        
        // If subscription was in trial, set it to active
        if subscription.status == SubscriptionStatus::Trial {
            // Update subscription stats
            let mut stats = Self::get_subscription_stats(env.clone());
            stats.trial -= 1;
            stats.active += 1;
            env.storage().instance().set(&SUBSCRIPTION_STATS, &stats);
            
            subscription.status = SubscriptionStatus::Active;
        }
        
        // Check if subscription has expired
        if subscription.end_time > 0 && current_time >= subscription.end_time {
            subscription.status = SubscriptionStatus::Expired;
            
            // Update subscription stats
            let mut stats = Self::get_subscription_stats(env.clone());
            stats.active -= 1;
            stats.expired += 1;
            env.storage().instance().set(&SUBSCRIPTION_STATS, &stats);
        }
        
        // Save the updated subscription
        env.storage().instance().set(&key, &subscription);
        
        // Update payment count
        env.storage().instance().set(&PAYMENT_COUNT, &payment_count);
        
        // Generate invoice - capture result but don't need to use it immediately
        Self::generate_invoice(
            env.clone(), 
            subscription_id, 
            subscription.amount, 
            current_time,
            true
        );
        
        // Extend storage TTL
        env.storage().instance().extend_ttl(10000, 10000);
        
        log!(&env, "Payment processed with ID: {}", payment_count);
        
        payment_count
    }
    
    // Generate an invoice
    fn generate_invoice(
        env: Env,
        subscription_id: u64,
        amount: u128,
        issued_time: u64,
        is_paid: bool,
    ) -> u64 {
        // Get the current invoice count and increment it
        let mut invoice_count: u64 = env.storage().instance().get(&INVOICE_COUNT).unwrap_or(0);
        invoice_count += 1;
        
        // Due time is 14 days after issued time
        let due_time = issued_time + 1209600;
        
        // Create invoice
        let invoice = Invoice {
            invoice_id: invoice_count,
            subscription_id,
            amount,
            issued_time,
            due_time,
            status: is_paid,
        };
        
        // Save the invoice
        env.storage().instance().set(
            &InvoiceBook::Invoice(invoice_count), 
            &invoice
        );
        
        // Update invoice count
        env.storage().instance().set(&INVOICE_COUNT, &invoice_count);
        
        log!(&env, "Invoice generated with ID: {}", invoice_count);
        
        invoice_count
    }
    
    // Cancel a subscription
    pub fn cancel_subscription(env: Env, subscription_id: u64, caller: Address) {
        // Get the subscription
        let key = SubscriptionBook::Subscription(subscription_id);
        let mut subscription: Subscription = env.storage().instance().get(&key)
            .expect("Subscription not found");
        
        // Require authentication from caller
        caller.require_auth();
        
        // Check if caller is either subscriber or provider
        if caller != subscription.subscriber && caller != subscription.provider {
            log!(&env, "Only subscriber or provider can cancel a subscription");
            panic!("Only subscriber or provider can cancel a subscription");
        }
        
        // Check if the subscription is not already cancelled or expired
        if subscription.status == SubscriptionStatus::Cancelled || 
           subscription.status == SubscriptionStatus::Expired {
            log!(&env, "Subscription is already cancelled or expired");
            panic!("Subscription is already cancelled or expired");
        }
        
        // Update subscription stats
        let mut stats = Self::get_subscription_stats(env.clone());
        if subscription.status == SubscriptionStatus::Active {
            stats.active -= 1;
        } else if subscription.status == SubscriptionStatus::Paused {
            stats.paused -= 1;
        } else if subscription.status == SubscriptionStatus::Trial {
            stats.trial -= 1;
        }
        stats.cancelled += 1;
        env.storage().instance().set(&SUBSCRIPTION_STATS, &stats);
        
        // Update the subscription status
        subscription.status = SubscriptionStatus::Cancelled;
        
        // Save the updated subscription
        env.storage().instance().set(&key, &subscription);
        
        log!(&env, "Subscription with ID: {} has been cancelled", subscription_id);
    }
    
    // Pause a subscription
    pub fn pause_subscription(env: Env, subscription_id: u64) {
        // Get the subscription
        let key = SubscriptionBook::Subscription(subscription_id);
        let mut subscription: Subscription = env.storage().instance().get(&key)
            .expect("Subscription not found");
        
        // Only subscriber can pause
        subscription.subscriber.require_auth();
        
        // Check if the subscription is active
        if subscription.status != SubscriptionStatus::Active && 
           subscription.status != SubscriptionStatus::Trial {
            log!(&env, "Only active subscriptions can be paused");
            panic!("Only active subscriptions can be paused");
        }
        
        // Update subscription stats
        let mut stats = Self::get_subscription_stats(env.clone());
        if subscription.status == SubscriptionStatus::Active {
            stats.active -= 1;
        } else if subscription.status == SubscriptionStatus::Trial {
            stats.trial -= 1;
        }
        stats.paused += 1;
        env.storage().instance().set(&SUBSCRIPTION_STATS, &stats);
        
        // Update the subscription status
        subscription.status = SubscriptionStatus::Paused;
        
        // Save the updated subscription
        env.storage().instance().set(&key, &subscription);
        
        log!(&env, "Subscription with ID: {} has been paused", subscription_id);
    }
    
    // Resume a paused subscription
    pub fn resume_subscription(env: Env, subscription_id: u64) {
        // Get the subscription
        let key = SubscriptionBook::Subscription(subscription_id);
        let mut subscription: Subscription = env.storage().instance().get(&key)
            .expect("Subscription not found");
        
        // Only subscriber can resume
        subscription.subscriber.require_auth();
        
        // Check if the subscription is paused
        if subscription.status != SubscriptionStatus::Paused {
            log!(&env, "Only paused subscriptions can be resumed");
            panic!("Only paused subscriptions can be resumed");
        }
        
        // Update subscription stats
        let mut stats = Self::get_subscription_stats(env.clone());
        stats.paused -= 1;
        stats.active += 1;
        env.storage().instance().set(&SUBSCRIPTION_STATS, &stats);
        
        // Update the subscription status and next billing time
        subscription.status = SubscriptionStatus::Active;
        subscription.next_billing = Self::calculate_next_billing(
            env.ledger().timestamp(), 
            subscription.frequency.clone()
        );
        
        // Save the updated subscription
        env.storage().instance().set(&key, &subscription);
        
        log!(&env, "Subscription with ID: {} has been resumed", subscription_id);
    }
    
    // Update subscription amount
    pub fn update_subscription_amount(env: Env, subscription_id: u64, new_amount: u128) {
        // Get the subscription
        let key = SubscriptionBook::Subscription(subscription_id);
        let mut subscription: Subscription = env.storage().instance().get(&key)
            .expect("Subscription not found");
        
        // Only provider can update the amount
        subscription.provider.require_auth();
        
        // Check if the subscription is not cancelled or expired
        if subscription.status == SubscriptionStatus::Cancelled || 
           subscription.status == SubscriptionStatus::Expired {
            log!(&env, "Cannot update amount for cancelled or expired subscription");
            panic!("Cannot update amount for cancelled or expired subscription");
        }
        
        // Update the subscription amount
        subscription.amount = new_amount;
        
        // Save the updated subscription
        env.storage().instance().set(&key, &subscription);
        
        log!(&env, "Subscription with ID: {} amount updated to {}", subscription_id, new_amount);
    }
    
    // Get all subscriptions for a subscriber
    pub fn get_subscriber_subscriptions(env: Env, subscriber: Address) -> Vec<u64> {
        let key = UserSubscriptions::Subscriber(subscriber);
        env.storage().instance().get(&key).unwrap_or(Vec::new(&env))
    }
    
    // Get all subscriptions for a provider
    pub fn get_provider_subscriptions(env: Env, provider: Address) -> Vec<u64> {
        let key = UserSubscriptions::Provider(provider);
        env.storage().instance().get(&key).unwrap_or(Vec::new(&env))
    }
    
    // Get subscription details
    pub fn get_subscription(env: Env, subscription_id: u64) -> Subscription {
        let key = SubscriptionBook::Subscription(subscription_id);
        env.storage().instance().get(&key)
            .expect("Subscription not found")
    }
    
    // Get payment details
    pub fn get_payment(env: Env, payment_id: u64) -> Payment {
        let key = PaymentBook::Payment(payment_id);
        env.storage().instance().get(&key)
            .expect("Payment not found")
    }
    
    // Get invoice details
    pub fn get_invoice(env: Env, invoice_id: u64) -> Invoice {
        let key = InvoiceBook::Invoice(invoice_id);
        env.storage().instance().get(&key)
            .expect("Invoice not found")
    }
    
    // Get subscription stats
    pub fn get_subscription_stats(env: Env) -> SubscriptionStats {
        env.storage().instance().get(&SUBSCRIPTION_STATS).unwrap_or(SubscriptionStats {
            total: 0,
            active: 0,
            paused: 0,
            cancelled: 0,
            expired: 0,
            trial: 0,
        })
    }
}
