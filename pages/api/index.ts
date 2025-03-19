import { NextApiRequest, NextApiResponse } from 'next';

type ApiResponse = {
  name: string;
  version: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  res.status(200).json({ 
    name: 'Last Man Standing API',
    version: '1.0.0',
  });
} 