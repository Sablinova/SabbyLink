import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as Cog6ToothIcon, 
  Key as KeyIcon, 
  Bell as BellIcon, 
  ShieldCheck as ShieldCheckIcon,
  Paintbrush as PaintBrushIcon,
  Server as ServerIcon,
  Trash2 as TrashIcon,
  RefreshCw as ArrowPathIcon,
  CheckCircle as CheckCircleIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Shield as ShieldIcon,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-react';
import { useThemeStore } from '../store/theme';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

interface UserSettings {
  username: string;
  email: string;
  notifications: {
    botStatus: boolean;
    errors: boolean;
    analytics: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
}

interface DangerZone {
  deleteAccount: boolean;
  resetSettings: boolean;
}

interface SettingMeta {
  key: string;
  label: string;
  description: string;
  category: string;
  type: 'string' | 'boolean' | 'number' | 'select';
  options?: { value: string; label: string }[];
  default: string;
  encrypted?: boolean;
  required?: boolean;
}

interface AdminSettings {
  [key: string]: string | null;
}

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings>({
    username: '',
    email: '',
    notifications: {
      botStatus: true,
      errors: true,
      analytics: false,
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [dangerConfirm, setDangerConfirm] = useState<DangerZone>({
    deleteAccount: false,
    resetSettings: false,
  });
  
  // Admin settings state
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({});
  const [adminMetadata, setAdminMetadata] = useState<SettingMeta[]>([]);
  const [oauthConfigured, setOauthConfigured] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    checkAdminStatus();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setSettings(prev => ({
          ...prev,
          ...response.data,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await api.get('/admin/settings');
      if (response.data) {
        setIsAdmin(true);
        setAdminSettings(response.data.settings || {});
        setAdminMetadata(response.data.metadata || []);
        setOauthConfigured(response.data.oauthConfigured || false);
      }
    } catch (error: any) {
      // 403 = not admin, which is fine
      if (error.response?.status !== 403) {
        console.error('Failed to check admin status:', error);
      }
      setIsAdmin(false);
    }
  };

  const fetchAdminSettings = async () => {
    setAdminLoading(true);
    try {
      const response = await api.get('/admin/settings');
      if (response.data) {
        setAdminSettings(response.data.settings || {});
        setOauthConfigured(response.data.oauthConfigured || false);
      }
    } catch (error) {
      console.error('Failed to fetch admin settings:', error);
    } finally {
      setAdminLoading(false);
    }
  };

  const saveAdminSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.put('/admin/settings', { settings: adminSettings });
      if (response.data) {
        setAdminSettings(response.data.settings || {});
        setOauthConfigured(response.data.oauthConfigured || false);
        setMessage({ type: 'success', text: 'Admin settings saved successfully!' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save admin settings' });
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings', settings);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwords.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    if (!dangerConfirm.resetSettings) {
      setDangerConfirm(prev => ({ ...prev, resetSettings: true }));
      return;
    }

    setSaving(true);
    try {
      await api.post('/settings/reset');
      setMessage({ type: 'success', text: 'Settings reset to defaults' });
      fetchSettings();
      setDangerConfirm(prev => ({ ...prev, resetSettings: false }));
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to reset settings' });
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!dangerConfirm.deleteAccount) {
      setDangerConfirm(prev => ({ ...prev, deleteAccount: true }));
      return;
    }

    setSaving(true);
    try {
      await api.delete('/settings/account');
      window.location.href = '/login';
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete account' });
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'api', name: 'API Keys', icon: KeyIcon },
    ...(isAdmin ? [{ id: 'admin', name: 'Admin', icon: ShieldIcon }] : []),
    { id: 'danger', name: 'Danger Zone', icon: ExclamationTriangleIcon },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account and application preferences</p>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5" />
          )}
          {message.text}
        </motion.div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-400 hover:bg-dark-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-dark-800 rounded-xl border border-dark-700 p-6"
          >
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">General Settings</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={settings.username}
                      onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Appearance</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['dark', 'light', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          theme === t
                            ? 'border-primary-500 bg-primary-500/20'
                            : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                        }`}
                      >
                        <div className="text-center">
                          <div className={`w-12 h-12 mx-auto rounded-lg mb-2 ${
                            t === 'dark' ? 'bg-dark-900' :
                            t === 'light' ? 'bg-gray-200' :
                            'bg-gradient-to-br from-dark-900 to-gray-200'
                          }`} />
                          <span className="text-sm text-gray-300 capitalize">{t}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    Accent Color
                  </label>
                  <div className="flex gap-3">
                    {['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map((color) => (
                      <button
                        key={color}
                        className="w-10 h-10 rounded-full border-2 border-dark-600 hover:border-white transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {[
                    { key: 'botStatus', label: 'Bot Status Changes', desc: 'Get notified when your bot connects or disconnects' },
                    { key: 'errors', label: 'Error Alerts', desc: 'Receive alerts when errors occur' },
                    { key: 'analytics', label: 'Weekly Analytics', desc: 'Receive weekly usage reports' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{item.label}</p>
                        <p className="text-sm text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          notifications: {
                            ...prev.notifications,
                            [item.key]: !prev.notifications[item.key as keyof typeof prev.notifications],
                          },
                        }))}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          settings.notifications[item.key as keyof typeof settings.notifications]
                            ? 'bg-primary-500'
                            : 'bg-dark-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          settings.notifications[item.key as keyof typeof settings.notifications]
                            ? 'translate-x-6'
                            : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">Security Settings</h2>
                
                {/* Change Password */}
                <div className="p-4 bg-dark-700 rounded-lg space-y-4">
                  <h3 className="font-medium text-white">Change Password</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <button
                    onClick={changePassword}
                    disabled={saving || !passwords.current || !passwords.new || !passwords.confirm}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-600 disabled:text-gray-500 text-white rounded-lg transition-colors"
                  >
                    Update Password
                  </button>
                </div>

                {/* Session Timeout */}
                <div className="p-4 bg-dark-700 rounded-lg">
                  <h3 className="font-medium text-white mb-4">Session Timeout</h3>
                  <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      security: { ...prev.security, sessionTimeout: parseInt(e.target.value) },
                    }))}
                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={480}>8 hours</option>
                    <option value={1440}>24 hours</option>
                  </select>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-4 bg-dark-700 rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                  </div>
                  <button className="px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors">
                    {settings.security.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white">API Keys</h2>
                <p className="text-gray-400">Manage API keys for external integrations</p>
                
                <div className="space-y-4">
                  {[
                    { name: 'OpenAI', configured: true },
                    { name: 'Anthropic (Claude)', configured: false },
                    { name: 'Google (Gemini)', configured: false },
                    { name: 'Groq', configured: false },
                  ].map((provider) => (
                    <div key={provider.name} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <ServerIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-white font-medium">{provider.name}</p>
                          <p className="text-sm text-gray-400">
                            {provider.configured ? 'API key configured' : 'Not configured'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {provider.configured && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            Active
                          </span>
                        )}
                        <button className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 text-white text-sm rounded-lg transition-colors">
                          {provider.configured ? 'Update' : 'Configure'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 text-sm">
                    <strong>Note:</strong> API keys are encrypted with AES-256-GCM before storage. 
                    We never store or log your keys in plain text.
                  </p>
                </div>
              </div>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
                <p className="text-gray-400">Irreversible and destructive actions</p>
                
                <div className="space-y-4">
                  {/* Reset Settings */}
                  <div className="p-4 bg-dark-700 border border-red-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">Reset All Settings</h3>
                        <p className="text-sm text-gray-400">Reset all settings to their default values</p>
                      </div>
                      <button
                        onClick={resetSettings}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          dangerConfirm.resetSettings
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-dark-600 hover:bg-dark-500 text-white'
                        }`}
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        {dangerConfirm.resetSettings ? 'Confirm Reset' : 'Reset Settings'}
                      </button>
                    </div>
                    {dangerConfirm.resetSettings && (
                      <p className="mt-2 text-sm text-red-400">
                        Click again to confirm. This action cannot be undone.
                      </p>
                    )}
                  </div>

                  {/* Delete Account */}
                  <div className="p-4 bg-dark-700 border border-red-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">Delete Account</h3>
                        <p className="text-sm text-gray-400">Permanently delete your account and all data</p>
                      </div>
                      <button
                        onClick={deleteAccount}
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          dangerConfirm.deleteAccount
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-dark-600 hover:bg-dark-500 text-white'
                        }`}
                      >
                        <TrashIcon className="w-4 h-4" />
                        {dangerConfirm.deleteAccount ? 'Confirm Delete' : 'Delete Account'}
                      </button>
                    </div>
                    {dangerConfirm.deleteAccount && (
                      <p className="mt-2 text-sm text-red-400">
                        Click again to confirm. This will permanently delete your account, all Discord accounts, 
                        configurations, and data. This action cannot be undone.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Admin Tab - System Settings (Zero VPS Config) */}
            {activeTab === 'admin' && isAdmin && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ShieldIcon className="w-5 h-5 text-primary-400" />
                      System Settings
                    </h2>
                    <p className="text-gray-400">Configure application-wide settings (no VPS access needed)</p>
                  </div>
                  <button
                    onClick={fetchAdminSettings}
                    disabled={adminLoading}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Refresh"
                  >
                    <ArrowPathIcon className={`w-5 h-5 ${adminLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Discord OAuth Status */}
                <div className={`p-4 rounded-lg border ${oauthConfigured ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  <div className="flex items-center gap-3">
                    {oauthConfigured ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
                    )}
                    <div>
                      <p className={oauthConfigured ? 'text-green-400' : 'text-yellow-400'}>
                        {oauthConfigured ? 'Discord OAuth Configured' : 'Discord OAuth Not Configured'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {oauthConfigured 
                          ? 'Users can login with Discord' 
                          : 'Configure below to enable Discord login'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settings by Category */}
                {['discord', 'features', 'rpc', 'security', 'analytics', 'backup'].map(category => {
                  const categorySettings = adminMetadata.filter(m => m.category === category);
                  if (categorySettings.length === 0) return null;

                  return (
                    <div key={category} className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {categorySettings.map(meta => (
                          <div key={meta.key} className="p-4 bg-dark-700 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 mr-4">
                                <label className="block text-white font-medium">
                                  {meta.label}
                                  {meta.required && <span className="text-red-400 ml-1">*</span>}
                                  {meta.encrypted && <span className="text-yellow-400 ml-2 text-xs">(encrypted)</span>}
                                </label>
                                <p className="text-sm text-gray-400">{meta.description}</p>
                              </div>
                              <div className="w-64">
                                {meta.type === 'boolean' ? (
                                  <button
                                    onClick={() => setAdminSettings(prev => ({
                                      ...prev,
                                      [meta.key]: prev[meta.key] === 'true' ? 'false' : 'true',
                                    }))}
                                    className={`w-12 h-6 rounded-full transition-colors ${
                                      adminSettings[meta.key] === 'true'
                                        ? 'bg-primary-500'
                                        : 'bg-dark-600'
                                    }`}
                                  >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                      adminSettings[meta.key] === 'true'
                                        ? 'translate-x-6'
                                        : 'translate-x-0.5'
                                    }`} />
                                  </button>
                                ) : meta.type === 'select' ? (
                                  <select
                                    value={adminSettings[meta.key] || meta.default}
                                    onChange={(e) => setAdminSettings(prev => ({
                                      ...prev,
                                      [meta.key]: e.target.value,
                                    }))}
                                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                  >
                                    {meta.options?.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type={meta.encrypted ? 'password' : meta.type === 'number' ? 'number' : 'text'}
                                    value={adminSettings[meta.key] || ''}
                                    onChange={(e) => setAdminSettings(prev => ({
                                      ...prev,
                                      [meta.key]: e.target.value,
                                    }))}
                                    placeholder={meta.default || `Enter ${meta.label}`}
                                    className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary-500"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Help Links */}
                <div className="p-4 bg-dark-700 rounded-lg space-y-3">
                  <h3 className="font-medium text-white">Setup Help</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <a
                      href="https://discord.com/developers/applications"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      <ExternalLinkIcon className="w-4 h-4" />
                      Discord Developer Portal
                    </a>
                    <p className="text-sm text-gray-400">
                      Create an app, copy Client ID and Secret, set OAuth2 redirect to your login URL
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-700">
                  <button
                    onClick={saveAdminSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-500/50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                    Save System Settings
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
