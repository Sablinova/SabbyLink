import { useState, useEffect } from 'react';
import { rpcApi } from '../lib/api';
import { Gamepad2, Plus, Edit2, Trash2, Power, Loader2 } from 'lucide-react';

interface RPCConfig {
  id: number;
  name: string;
  platform: string;
  enabled: boolean;
  states: any[];
}

const PLATFORMS = [
  { value: 'xbox', label: 'Xbox', color: 'bg-xbox' },
  { value: 'playstation', label: 'PlayStation', color: 'bg-playstation' },
  { value: 'pc', label: 'PC', color: 'bg-discord-blurple' },
  { value: 'mobile', label: 'Mobile', color: 'bg-brand-500' },
  { value: 'switch', label: 'Nintendo Switch', color: 'bg-nintendo' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-500' },
];

export default function RPCPage() {
  const [configs, setConfigs] = useState<RPCConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RPCConfig | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('pc');
  const [details, setDetails] = useState('');
  const [state, setState] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfigs = async () => {
    try {
      const response = await rpcApi.getConfigs();
      setConfigs(response.data.configs);
    } catch (error) {
      console.error('Failed to fetch RPC configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await rpcApi.createConfig({
        name,
        platform,
        enabled: false,
        states: [{ details, state, duration: 60 }],
      });
      await fetchConfigs();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create RPC config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await rpcApi.toggleConfig(id);
      await fetchConfigs();
    } catch (error) {
      console.error('Failed to toggle RPC config:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this RPC config?')) return;
    try {
      await rpcApi.deleteConfig(id);
      await fetchConfigs();
    } catch (error) {
      console.error('Failed to delete RPC config:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setPlatform('pc');
    setDetails('');
    setState('');
    setEditingConfig(null);
  };

  const getPlatformInfo = (platformValue: string) => {
    return PLATFORMS.find((p) => p.value === platformValue) || PLATFORMS[5];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rich Presence</h1>
          <p className="text-muted-foreground">
            Configure multi-platform RPC emulation
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New RPC
        </button>
      </div>

      {/* RPC Configs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {configs.map((config) => {
          const platformInfo = getPlatformInfo(config.platform);
          return (
            <div
              key={config.id}
              className={`card p-4 ${
                config.enabled ? 'border-brand-500' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full ${platformInfo.color} flex items-center justify-center`}
                  >
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{config.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {platformInfo.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(config.id)}
                  className={`p-2 rounded-full ${
                    config.enabled
                      ? 'bg-discord-green/20 text-discord-green'
                      : 'bg-gray-500/20 text-gray-500'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              <div className="text-sm text-muted-foreground mb-3">
                {config.states?.[0]?.details || 'No details set'}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingConfig(config);
                    setName(config.name);
                    setPlatform(config.platform);
                    setDetails(config.states?.[0]?.details || '');
                    setState(config.states?.[0]?.state || '');
                    setShowModal(true);
                  }}
                  className="btn-ghost text-sm"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="btn-ghost text-sm text-destructive"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {configs.length === 0 && (
          <div className="col-span-full card p-8 text-center">
            <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No RPC Configs</h3>
            <p className="text-muted-foreground mb-4">
              Create your first Rich Presence configuration
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create RPC
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-bold mb-4">
              {editingConfig ? 'Edit RPC' : 'Create RPC'}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="My Gaming Session"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Platform
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="input"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Details
                </label>
                <input
                  type="text"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="input"
                  placeholder="Playing a game"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="input"
                  placeholder="In a match"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingConfig ? (
                    'Save'
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
