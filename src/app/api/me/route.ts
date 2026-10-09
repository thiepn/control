import { requireOwner, json } from '@/lib/http';
export async function GET() { const auth=await requireOwner(); return auth?json({authenticated:true}):json({authenticated:false},401); }
