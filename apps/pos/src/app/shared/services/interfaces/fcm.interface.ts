/**
 * FCM (Firebase Cloud Messaging) interfaces
 */

export interface FCMDeviceInfo {
  model?: string;
  os_version?: string;
  [key: string]: any;
}

export interface FCMRegisterPayload {
  token: string;
  platform: 'ios' | 'android' | 'web';
  app_version?: string;
  device_info?: FCMDeviceInfo;
  customer_id?: string;
}

export interface FCMRegisterResponse {
  success: boolean;
  device: {
    id: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    app_version?: string;
    device_info?: FCMDeviceInfo;
    customer_id?: string | null;
    user_id?: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface FCMUnregisterResponse {
  success: boolean;
  message: string;
}

export interface FCMNotificationData {
  order_id?: string;
  type?: string;
  amount?: string;
  product_id?: string;
  return_id?: string;
  [key: string]: any;
}

export interface FCMNotification {
  title?: string;
  body?: string;
  data?: FCMNotificationData;
  [key: string]: any;
}

