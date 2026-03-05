"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Plus, Save, Trash2, Play, MessageSquare, GitBranch,
  Zap, Globe, Bot, ChevronDown,
} from "lucide-react";

interface FlowNode {
  id: string;
  type: "trigger" | "message" | "condition" | "action" | "api_call" | "ai_response";
  position: { x: number; y: number };
  data: {
    label: string;
    content?: string;
    condition?: string;
    action?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

const NODE_TYPES = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "border-yellow-500 bg-yellow-500/10" },
  { type: "message", label: "Message", icon: MessageSquare, color: "border-blue-500 bg-blue-500/10" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "border-purple-500 bg-purple-500/10" },
  { type: "action", label: "Action", icon: Play, color: "border-green-500 bg-green-500/10" },
  { type: "api_call", label: "API Call", icon: Globe, color: "border-orange-500 bg-orange-500/10" },
  { type: "ai_response", label: "AI Response", icon: Bot, color: "border-pink-500 bg-pink-500/10" },
];

export default function FlowBuilderPage() {
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: "1", type: "trigger", position: { x: 100, y: 100 }, data: { label: "User Message", content: "When user sends a message" } },
    { id: "2", type: "condition", position: { x: 100, y: 250 }, data: { label: "Check Intent", condition: "intent == 'greeting'" } },
    { id: "3", type: "ai_response", position: { x: 100, y: 400 }, data: { label: "AI Reply", content: "Generate contextual response" } },
  ]);
  const [edges, setEdges] = useState<FlowEdge[]>([
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3", label: "Yes" },
  ]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [flowName, setFlowName] = useState("My Chatbot Flow");
  const [draggedType, setDraggedType] = useState<string | null>(null);

  const addNode = (type: string) => {
    const id = `node_${Date.now()}`;
    const nodeType = NODE_TYPES.find((n) => n.type === type);
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: type as FlowNode["type"],
        position: { x: 300 + Math.random() * 200, y: 100 + Math.random() * 300 },
        data: { label: nodeType?.label || type, content: "" },
      },
    ]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  };

  const updateNodeData = (nodeId: string, key: string, value: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, [key]: value } } : n))
    );
  };

  const saveFlow = async () => {
    try {
      // Would save to the flows API
      alert("Flow saved successfully!");
    } catch { /* ignore */ }
  };

  const selected = nodes.find((n) => n.id === selectedNode);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 rounded-md hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="text-lg font-bold border-none bg-transparent focus-visible:ring-0 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Play className="w-3 h-3 mr-1" /> Test
          </Button>
          <Button size="sm" onClick={saveFlow}>
            <Save className="w-3 h-3 mr-1" /> Save
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Node Palette */}
        <aside className="w-56 border-r p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Components</p>
          {NODE_TYPES.map((nodeType) => (
            <button
              key={nodeType.type}
              onClick={() => addNode(nodeType.type)}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg border-2 text-sm font-medium transition-colors hover:shadow-sm ${nodeType.color}`}
            >
              <nodeType.icon className="w-4 h-4" />
              {nodeType.label}
            </button>
          ))}
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative overflow-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMyMjIiIG9wYWNpdHk9IjAuMiIvPjwvc3ZnPg==')]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((edge) => {
              const source = nodes.find((n) => n.id === edge.source);
              const target = nodes.find((n) => n.id === edge.target);
              if (!source || !target) return null;
              const sx = source.position.x + 100;
              const sy = source.position.y + 40;
              const tx = target.position.x + 100;
              const ty = target.position.y;
              return (
                <g key={edge.id}>
                  <path
                    d={`M${sx},${sy} C${sx},${sy + 50} ${tx},${ty - 50} ${tx},${ty}`}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    opacity="0.5"
                  />
                  {edge.label && (
                    <text
                      x={(sx + tx) / 2}
                      y={(sy + ty) / 2}
                      textAnchor="middle"
                      className="fill-muted-foreground text-xs"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {nodes.map((node) => {
            const nodeType = NODE_TYPES.find((n) => n.type === node.type);
            const Icon = nodeType?.icon || Zap;
            return (
              <div
                key={node.id}
                className={`absolute w-48 rounded-lg border-2 bg-card shadow-md cursor-pointer transition-shadow ${
                  selectedNode === node.id ? "ring-2 ring-primary shadow-lg" : ""
                } ${nodeType?.color || ""}`}
                style={{ left: node.position.x, top: node.position.y }}
                onClick={() => setSelectedNode(node.id)}
              >
                <div className="px-3 py-2 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium flex-1 truncate">{node.data.label}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {node.data.content && (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-muted-foreground truncate">{node.data.content}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Properties Panel */}
        {selected && (
          <aside className="w-72 border-l p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Properties</h3>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Label</label>
                <Input
                  value={selected.data.label}
                  onChange={(e) => updateNodeData(selected.id, "label", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Content</label>
                <textarea
                  value={selected.data.content || ""}
                  onChange={(e) => updateNodeData(selected.id, "content", e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                />
              </div>
              {selected.type === "condition" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Condition</label>
                  <Input
                    value={selected.data.condition || ""}
                    onChange={(e) => updateNodeData(selected.id, "condition", e.target.value)}
                    className="mt-1"
                    placeholder="intent == 'greeting'"
                  />
                </div>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => deleteNode(selected.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete Node
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
