
import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { createAgreement } from '../utils/stellar';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon, CheckIcon, LoaderIcon } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';

const formSchema = z.object({
  recipient: z.string().min(56, 'Recipient address must be a valid Stellar address'),
  asset: z.object({
    code: z.string().min(1, 'Asset code is required'),
    issuer: z.string().optional(),
  }),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.date(),
  indefinite: z.boolean(),
  cycles: z.number().min(1).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CreatePayment: React.FC = () => {
  const { isConnected, publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: '',
      asset: { code: 'XLM', issuer: undefined },
      amount: '',
      frequency: 'monthly',
      startDate: new Date(),
      indefinite: false,
      cycles: 12,
    },
  });

  const indefinite = form.watch('indefinite');

  const onSubmit = async (data: FormValues) => {
    if (!publicKey) {
      toast({
        title: "Error",
        description: "You must connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createAgreement(
        publicKey,
        data.recipient,
        { 
          code: data.asset.code || 'XLM', 
          issuer: data.asset.issuer 
        },
        data.amount,
        data.frequency,
        data.startDate,
        data.indefinite ? null : data.cycles
      );

      toast({
        title: "Success",
        description: "Payment agreement created successfully",
      });
      
      navigate('/manage');
    } catch (error) {
      console.error("Error creating agreement:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create agreement",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container py-6">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Connect Your Wallet</CardTitle>
            <CardDescription>
              Connect your Freighter wallet to create recurring payments
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">Create Recurring Payment</h1>
      
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>New Payment Agreement</CardTitle>
          <CardDescription>
            Set up an automated recurring payment on the Stellar network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Address</FormLabel>
                    <FormControl>
                      <Input placeholder="G..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the Stellar public key of the recipient
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="asset.code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="XLM">XLM (Stellar Lumens)</SelectItem>
                          <SelectItem value="USDC">USDC (testnet)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the asset for payment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.0000001" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormDescription>
                        The amount to send each cycle
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Payment Frequency</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-y-0 sm:space-x-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="daily" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Daily
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="weekly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Weekly
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="monthly" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Monthly
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      The date when the first payment should occur
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="indefinite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Indefinite Payments</FormLabel>
                      <FormDescription>
                        Run this agreement indefinitely until cancelled
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {!indefinite && (
                <FormField
                  control={form.control}
                  name="cycles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Cycles</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} onChange={event => field.onChange(+event.target.value)} />
                      </FormControl>
                      <FormDescription>
                        How many payments should be made
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    Creating Agreement...
                  </>
                ) : (
                  <>
                    <CheckIcon className="mr-2 h-4 w-4" />
                    Create Agreement
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreatePayment;
