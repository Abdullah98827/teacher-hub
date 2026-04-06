// Logging utility for app-wide event logging to Supabase app_logs table
import { supabase } from '../supabase';

/**
 * Log an event to the app_logs table.
 * @param {Object} params
 * @param {string} params.event_type - The type of event (e.g., 'LOGIN', 'RESOURCE_CREATED')
 * @param {string} [params.user_id] - The user who triggered the event
 * @param {string} [params.target_id] - The affected entity (resource, report, etc.)
 * @param {string} [params.target_table] - The table of the affected entity
 * @param {Object} [params.details] - Additional event-specific data
 */
export async function logEvent({ event_type, user_id, target_id, target_table, details }) {
  let ip_address = null;
  let user_agent = null;

  // Attempt to get device info (user agent) for mobile/web - non-blocking
  // This is optional and won't break if it fails
  import('expo-device')
    .then((Device) => {
      const defaultDevice = Device.default || Device;
      user_agent = `${defaultDevice.manufacturer || ''} ${defaultDevice.modelName || ''} ${defaultDevice.osName || ''} ${defaultDevice.osVersion || ''}`.trim();
    })
    .catch(() => {
      // Silently fail - device info is optional
    });

  // Attempt to get public IP address (client-side only, best effort)
  // This is optional and won't break if it fails
  const ipResponse = await fetch('https://api.ipify.org?format=json')
    .catch(() => null);
  
  if (ipResponse && ipResponse.ok) {
    const ipData = await ipResponse.json()
      .catch(() => null);
    
    if (ipData && ipData.ip) {
      ip_address = ipData.ip;
    }
  }

  // Attempt to log the event to Supabase
  // This is optional and won't break if it fails
  const { error } = await supabase.from('app_logs').insert([
    {
      event_type,
      user_id,
      target_id,
      target_table,
      details,
      ip_address,
      user_agent,
    },
  ]);
  
  // Silently fail if logging encounters an error - this should never break app functionality
  if (error) {
    // Error is logged silently to prevent disrupting the user experience
  }
}
