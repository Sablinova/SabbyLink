import { useState, useEffect } from 'react';
import { commandsApi } from '../lib/api';
import { Terminal, Plus, Edit2, Trash2, Power, Loader2 } from 'lucide-react';

interface Command {
  id: number;
  name: string;
  description: string;
  response: string;
  enabled: boolean;
  guildId?: string;
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [response, setResponse] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCommands = async () => {
    try {
      const res = await commandsApi.list();
      setCommands(res.data.commands);
    } catch (error) {
      console.error('Failed to fetch commands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommands();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCommand) {
        await commandsApi.update(editingCommand.id, { name, description, response });
      } else {
        await commandsApi.create({ name, description, response });
      }
      await fetchCommands();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save command:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await commandsApi.toggle(id);
      await fetchCommands();
    } catch (error) {
      console.error('Failed to toggle command:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this command?')) return;
    try {
      await commandsApi.delete(id);
      await fetchCommands();
    } catch (error) {
      console.error('Failed to delete command:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setResponse('');
    setEditingCommand(null);
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
          <h1 className="text-2xl font-bold">Commands</h1>
          <p className="text-muted-foreground">Create custom slash commands</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Command
        </button>
      </div>

      {/* Commands List */}
      <div className="space-y-3">
        {commands.map((command) => (
          <div
            key={command.id}
            className={`card p-4 ${command.enabled ? 'border-brand-500' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="font-semibold font-mono">/{command.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {command.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleToggle(command.id)}
                  className={`p-2 rounded-full ${
                    command.enabled
                      ? 'bg-discord-green/20 text-discord-green'
                      : 'bg-gray-500/20 text-gray-500'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingCommand(command);
                    setName(command.name);
                    setDescription(command.description);
                    setResponse(command.response);
                    setShowModal(true);
                  }}
                  className="btn-ghost"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(command.id)}
                  className="btn-ghost text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 p-3 bg-muted rounded-md">
              <p className="text-sm font-mono">{command.response}</p>
            </div>
          </div>
        ))}

        {commands.length === 0 && (
          <div className="card p-8 text-center">
            <Terminal className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Commands</h3>
            <p className="text-muted-foreground mb-4">
              Create your first custom command
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Command
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-fade-in">
            <h2 className="text-xl font-bold mb-4">
              {editingCommand ? 'Edit Command' : 'Create Command'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Command Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="input font-mono"
                  placeholder="mycommand"
                  required
                  pattern="^[a-z0-9_-]+$"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  placeholder="What does this command do?"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Response
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="input min-h-[100px] resize-y"
                  placeholder="The message to send when this command is used"
                  required
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
                  ) : editingCommand ? (
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
