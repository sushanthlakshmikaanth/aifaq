import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {AppError} from './ai.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(72).refine(x => Buffer.byteLength(x,'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes');
const faqSchema = z.object({
  question:z.string().trim().min(5).max(300),
  answer:z.string().trim().min(5).max(5000),
  category:z.enum(['General','Account','Billing','Orders','Support']).default('General')
}).strict();
const safeUser = x => ({id:x.id,name:x.name,email:x.email});
const seed = [
  {question:'How can I reset my password?',answer:'Choose Forgot password on the customer portal login page. Enter your registered email address and follow the reset link. The link expires after 30 minutes.',category:'Account'},
  {question:'What is the refund policy?',answer:'You can request a refund within 14 days of purchase. Contact support with your order number. Approved refunds are credited to the original payment method within 5 to 7 business days.',category:'Billing'},
  {question:'How long does delivery take?',answer:'Standard delivery takes 3 to 5 business days. Express delivery takes 1 to 2 business days. You will receive a tracking link by email after your order ships.',category:'Orders'},
  {question:'How do I contact customer support?',answer:'Email support@example.com or use the support form in your account. The sample support team is available Monday to Friday, 9 AM to 6 PM.',category:'Support'},
  {question:'Can I cancel my subscription?',answer:'Yes. Open Account settings, select Billing, and choose Cancel subscription. You can continue using the service until the end of your current billing period.',category:'Billing'},
  {question:'How do I update my account information?',answer:'Sign in and open Account settings. Update your name or contact details, then choose Save changes.',category:'Account'}
];
export function createApp({store, ai, secret, production=false, rateLimits=true}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req,res,next) => {req.requestId=crypto.randomUUID(); res.setHeader('X-Request-ID',req.requestId); next();});
  app.use(helmet());
  app.use(express.json({limit:'128kb'}));
  app.use('/api', (req,res,next) => {res.setHeader('Cache-Control','no-store'); next();});
  if (rateLimits) app.use('/api', rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Try again in a minute.'}}));
  // Reject cross-site browser mutations. Bearer-token API clients remain supported.
  app.use('/api', (req,res,next) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin) {
        let host;
        try {host = new URL(origin).host;} catch {return next(new AppError(403,'Invalid request origin.'));}
        if (host !== req.get('host')) return next(new AppError(403,'Cross-origin requests are not allowed.'));
      }
      if (req.get('sec-fetch-site') === 'cross-site') return next(new AppError(403,'Cross-site requests are not allowed.'));
    }
    next();
  });
  const cookieOptions = 'HttpOnly; SameSite=Strict; Path=/; Max-Age=28800' + (production ? '; Secure' : '');
  function session(res,user) {
    const token = jwt.sign({}, secret, {subject:user.id,expiresIn:'8h',issuer:'ai-faq-assistant',audience:'faq-users',algorithm:'HS256'});
    res.setHeader('Set-Cookie','faq_session=' + token + '; ' + cookieOptions);
    return {user:safeUser(user),token};
  }
  async function auth(req,res,next) {
    try {
      const bearer = req.get('authorization');
      const cookie = req.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith('faq_session='))?.slice(12);
      const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : cookie;
      if (!token) throw new Error();
      const payload = jwt.verify(token,secret,{algorithms:['HS256'],issuer:'ai-faq-assistant',audience:'faq-users'});
      req.user = await store.getUser(payload.sub);
      if (!req.user) throw new Error();
      next();
    } catch { next(new AppError(401,'Please sign in to continue.')); }
  }
  app.get('/api/health',(req,res) => res.json({app:'ai-faq-assistant',status:'ok',storage:store.mode,aiEnabled:ai.enabled,searchMode:ai.enabled?'semantic':'keyword-demo'}));
  if (rateLimits) app.use('/api/auth', rateLimit({windowMs:15*60000,limit:40,skipSuccessfulRequests:true,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many sign-in attempts. Try again in 15 minutes.'}}));
  app.post('/api/auth/register', async(req,res) => {
    const data = z.object({name:z.string().trim().min(2).max(60),email,password}).strict().parse(req.body);
    const user = await store.addUser({name:data.name,email:data.email,passwordHash:await bcrypt.hash(data.password,12),createdAt:new Date().toISOString()});
    res.status(201).json(session(res,user));
  });
  app.post('/api/auth/login', async(req,res) => {
    const data = z.object({email,password:z.string().min(1).max(200)}).strict().parse(req.body);
    const user = await store.findUser(data.email);
    const valid = await bcrypt.compare(data.password,user?.passwordHash || '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7mHvP.wkVCiIvHbCFXUwNXhjLtnIj5a');
    if (!user || !valid) throw new AppError(401,'Email or password is incorrect.');
    res.json(session(res,user));
  });
  app.post('/api/auth/logout',(req,res) => {
    res.setHeader('Set-Cookie','faq_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + (production?'; Secure':''));
    res.json({ok:true});
  });
  app.get('/api/auth/me',auth,(req,res) => res.json({user:safeUser(req.user)}));
  app.use('/api/faqs',auth);
  app.get('/api/faqs',async(req,res) => res.json({faqs:await store.list(req.user.id)}));
  app.post('/api/faqs',async(req,res) => {
    const data=faqSchema.parse(req.body);
    if ((await store.list(req.user.id)).length >= 1000) throw new AppError(409,'This demo supports up to 1,000 FAQs per account.');
    const now=new Date().toISOString();
    res.status(201).json({faq:await store.add(req.user.id,{...data,source:'manual',createdAt:now,updatedAt:now})});
  });
  app.put('/api/faqs/:id',async(req,res) => {
    const data=faqSchema.parse(req.body);
    const faq=await store.update(req.user.id,req.params.id,{...data,updatedAt:new Date().toISOString()});
    if (!faq) throw new AppError(404,'FAQ not found.');
    res.json({faq});
  });
  app.delete('/api/faqs/:id',async(req,res) => {
    if (!await store.remove(req.user.id,req.params.id)) throw new AppError(404,'FAQ not found.');
    res.json({ok:true});
  });
  app.post('/api/faqs/sample',async(req,res) => {
    const existing=await store.list(req.user.id), added=[];
    for (const faq of seed) {
      if (!existing.some(x => x.question === faq.question)) {
        const now=new Date().toISOString();
        added.push(await store.add(req.user.id,{...faq,source:'sample',createdAt:now,updatedAt:now}));
      }
    }
    res.status(201).json({added:added.length});
  });
  const aiLimiter = rateLimits ? rateLimit({windowMs:60000,limit:15,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait a minute before making more AI requests.'}}) : (req,res,next) => next();
  app.post('/api/generate',auth,aiLimiter,async(req,res) => {
    const data=z.object({text:z.string().trim().min(30).max(20000),count:z.number().int().min(1).max(8).default(5)}).strict().parse(req.body);
    const result=await ai.generate(data.text,data.count);
    const checked=z.array(faqSchema).safeParse(result.drafts);
    if (!checked.success) throw new AppError(502,'Generated drafts were invalid. Try again with clearer source text.');
    res.json({...result,drafts:checked.data});
  });
  app.post('/api/search',auth,aiLimiter,async(req,res) => {
    const {query}=z.object({query:z.string().trim().min(2).max(500)}).strict().parse(req.body);
    const faqs=await store.list(req.user.id);
    const result=await ai.search(query,faqs);
    const best=result.results[0];
    const threshold=result.mode==='semantic'?0.40:0.30;
    const matched=Boolean(best && best.score>=threshold);
    res.json({...result,matched,answer:matched?best.faq.answer:'I could not find a reliable answer in your knowledge base. Try rephrasing, add a relevant FAQ, or contact your support team.',source:matched?{id:best.faq.id,question:best.faq.question}:null});
  });
  app.use('/api',(req,res,next) => next(new AppError(404,'API endpoint not found.')));
  app.use(express.static(path.join(root,'public')));
  app.use((req,res,next) => next(new AppError(404,'Page not found.')));
  app.use((error,req,res,next) => {
    let status=500, message='Something went wrong. Please try again.';
    if (error instanceof z.ZodError) {status=400;message=error.issues.map(x => (x.path.join('.') || 'Request') + ': ' + x.message).join('; ');}
    else if (error.code===11000) {status=409;message='An account with this email already exists.';}
    else if (error.type==='entity.parse.failed') {status=400;message='Request body must be valid JSON.';}
    else if (error.type==='entity.too.large') {status=413;message='Request body is too large.';}
    else if (error instanceof AppError && Number.isInteger(error.status) && error.status>=400 && error.status<600) {status=error.status;message=error.message;}
    if (status>=500) console.error('Request failed',req.requestId,error.name);
    res.status(status).json({error:message,requestId:req.requestId});
  });
  return app;
}


