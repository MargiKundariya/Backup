'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { Project, Design } from '@/lib/db';
import {
  FolderOpen, Plus, Trash2, Smartphone, 
  Clock, Package, Search, Layout
} from 'lucide-react';
import { useEditorStore } from '@/lib/store';
import { useTemplateStore } from '@/lib/templateStore';
import { UserSidebar } from '@/components/sidebar/UserSidebar';

export default function ProjectsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { customDevices: allDevices, loadCustomDevices } = useTemplateStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const setCurrentDesignId = useEditorStore((s) => s.setCurrentDesignId);
  const setCurrentProjectId = useEditorStore((s) => s.setCurrentProjectId);

  useEffect(() => {
    loadCustomDevices();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?next=/projects');
  }, [user, authLoading, router]);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      const { projects: data } = await res.json();
      setProjects(data);
      if (data.length > 0 && !selectedProject) setSelectedProject(data[0]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (user) loadProjects();
  }, [user, loadProjects]);

  useEffect(() => {
    if (!selectedProject) return;
    fetch(`/api/designs?project_id=${selectedProject.id}`)
      .then(res => res.json())
      .then(data => setDesigns(data.designs))
      .catch(console.error);
  }, [selectedProject]);

  const handleCreateProject = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Project' })
      });
      if (!res.ok) throw new Error('Failed to create project');
      const { project: proj } = await res.json();
      setProjects((prev) => [proj, ...prev]);
      setSelectedProject(proj);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project and all its designs?')) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedProject?.id === id) setSelectedProject(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDesign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this design?')) return;
    try {
      const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete design');
      setDesigns((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openDesign = (design: Design) => {
    setCurrentDesignId(design.id);
    setCurrentProjectId(design.project_id);
    router.push('/');
  };

  const newDesign = () => {
    setCurrentDesignId(null);
    setCurrentProjectId(null);
    router.push('/');
  };

  const deviceName = (id: string) => allDevices.find((d) => d.id === id)?.name ?? id;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  if (authLoading || !user) return null;

  return (
    <div className="h-screen flex bg-canvas-bg overflow-hidden relative font-sans">
      <UserSidebar />

      <div className="flex flex-1 overflow-hidden">
        {/* Projects Inner Sidebar (Module Specific) */}
        <aside className="w-72 flex-shrink-0 border-r border-border/50 flex flex-col bg-slate-50/30">
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent/10 text-accent rounded-lg">
                  <Package size={18} />
                </div>
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-tight">Library</h2>
              </div>
              <button
                onClick={handleCreateProject}
                disabled={creating}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
              <input 
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-xl text-xs focus:ring-4 focus:ring-accent/5 focus:border-accent outline-none transition-all"
              />
            </div>
            
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-4 ml-1">My Projects</p>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 -mx-2 px-2 pb-10">
              {loading ? (
                <div className="space-y-3 mt-4">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-white/50 border border-border/50 animate-pulse rounded-2xl" />)}
                </div>
              ) : projects.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-xs text-text-muted font-medium">No projects found.</p>
                </div>
              ) : (
                projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                      selectedProject?.id === proj.id
                        ? 'bg-white shadow-xl shadow-slate-200/50 text-accent border border-white'
                        : 'hover:bg-white/60 text-text-secondary border border-transparent'
                    }`}
                  >
                    <FolderOpen size={16} className={selectedProject?.id === proj.id ? 'text-accent' : 'text-text-muted group-hover:text-accent'} />
                    <span className="flex-1 text-xs font-bold truncate tracking-tight">{proj.name}</span>
                    <button
                      onClick={(e) => handleDeleteProject(proj.id, e)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Designs grid */}
        <main className="flex-1 overflow-y-auto bg-canvas-bg h-full p-10">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-right-8 duration-700">
            {!selectedProject ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-text-muted gap-4">
                 <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center">
                    <Package size={32} className="opacity-20" />
                 </div>
                 <p className="text-sm font-medium">Select or create a project to see designs.</p>
              </div>
            ) : designs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-text-muted">
                <div className="w-20 h-20 bg-accent/5 rounded-[32px] flex items-center justify-center">
                   <Smartphone size={40} className="text-accent opacity-20" />
                </div>
                <div className="text-center">
                   <p className="text-lg font-bold text-text-primary tracking-tight">No designs in this project</p>
                   <p className="text-sm font-medium mt-1">Ready to start creating your first mockup?</p>
                </div>
                <button
                  onClick={newDesign}
                  className="flex items-center gap-3 px-8 py-4 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all"
                >
                  <Plus size={18} />
                  Start Designing
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8 px-2">
                   <div>
                      <h2 className="text-2xl font-bold text-text-primary tracking-tight">{selectedProject.name}</h2>
                      <p className="text-xs text-text-muted font-medium mt-1">{designs.length} Mockups saved in this collection</p>
                   </div>
                   <button 
                    onClick={newDesign}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-border text-text-primary rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                   >
                     <Plus size={16} />
                     New Mockup
                   </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {designs.map((design) => (
                    <div
                      key={design.id}
                      onClick={() => openDesign(design)}
                      className="group relative glass-card rounded-[32px] border border-white/20 p-5 cursor-pointer shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all duration-300"
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[4/5] rounded-[24px] bg-slate-50 mb-5 flex items-center justify-center overflow-hidden border border-border/50 group-hover:border-accent/30 transition-all">
                        {design.thumbnail ? (
                          <img src={design.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <Smartphone size={48} className="text-text-muted/10" />
                        )}
                        <div className="absolute inset-0 bg-accent/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                           <span className="px-6 py-3 bg-white text-accent rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl">Open Project</span>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2 px-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text-primary truncate tracking-tight">{design.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />
                             <p className="text-[10px] font-bold text-text-muted truncate uppercase tracking-tighter">{deviceName(design.device_id)}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDesign(design.id, e)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-all rounded-xl hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-2 px-1">
                         <Clock size={10} className="text-text-muted" />
                         <p className="text-[9px] font-bold text-text-muted uppercase tracking-tight">Updated {formatDate(design.updated_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
