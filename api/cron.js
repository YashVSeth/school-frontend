export default async function handler(req, res) {
  try {
    // Ping the backend to prevent Render's free tier from sleeping
    const backendUrl = 'https://school-backend-30rz.onrender.com/api/subjects'; 
    const response = await fetch(backendUrl);

    return res.status(200).json({ 
      success: true, 
      message: 'Server pinged successfully to keep it awake',
      status: response.status 
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return res.status(500).json({ error: 'Failed to ping server' });
  }
}

