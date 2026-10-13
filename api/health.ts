export default function handler(_req: any, res: any) {
  res.status(200).json({ status: 'healthy', platform: 'vercel', time: new Date().toISOString() });
}
