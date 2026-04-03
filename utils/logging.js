// Logging utility for app-wide event logging to Supabase app_logs table
import { supabase } from '../supabase';
import * as Device from 'expo-device';

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

  // Try to get device info (user agent) for mobile/web
  try {
    user_agent = `${Device.manufacturer || ''} ${Device.modelName || ''} ${Device.osName || ''} ${Device.osVersion || ''}`.trim();
  } catch {}

  // Try to get public IP address (client-side only, best effort)
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      ip_address = data.ip;
    }
  } catch {}

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
  if (error) {
    // Optionally handle/log error
    console.error('Failed to log event:', error);
  }
}
