import 'server-only';
import {getSetting} from '@/lib/admin/store';
import {hydrateSettings} from '@/lib/settings/store';
import {parseCurrencies,parsePaymentAccounts,type PaymentAccountSnapshot} from './currency';
export async function paymentOptions(){await hydrateSettings();return {currencies:parseCurrencies(getSetting('finance.currencies')||'["NGN","USD"]'),accounts:parsePaymentAccounts(getSetting('finance.accounts')||'[]')};}
export async function documentPaymentChoice(currency:string,accountId:string,existing?:PaymentAccountSnapshot|null,existingCurrency?:string){const options=await paymentOptions();if(!options.currencies.includes(currency) && currency!==existingCurrency)throw Error('Enable that currency in Settings, Studio and invoices first.');if(!accountId)return {currency,paymentAccount:null};const account=(existing?.id===accountId?existing:undefined)??options.accounts.find(item=>item.id===accountId);if(!account||account.currency!==currency)throw Error('Choose an account in the document currency.');return {currency,paymentAccount:{...account}};}
