// import "molstar/build/viewer/theme/dark.css";
// import "molstar/lib/mol-plugin-ui/skin/dark.scss";

import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DefaultPluginSpec } from "molstar/lib/mol-plugin/spec";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { createPluginUI } from "molstar/lib/mol-plugin-ui/index";
import { PluginContext } from "molstar/lib/mol-plugin/context";
import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";

// import "molstar/build/viewer/molstar.css";
import "./MolstarWrapper.css";

type PluginRef = PluginContext | PluginUIContext | null;

export interface MolstarWrapperProps {
  useInterface?: boolean;
  pdbId?: string | null;
  // structuredObject?: any;
  url?: string;
  file?: { filestring: string; type: string } | null;
  dimensions?: [number | string, number | string];
  className?: string;
  showControls?: boolean;
  showAxes?: boolean;
  uiTheme?: string;
}

function getStructureUrl(pdbId?: string, url?: string): string | null {
  if (url) return url;
  if (pdbId) return `https://files.rcsb.org/view/${pdbId}.cif`;
  return null;
}

function getExtensionFromUrl(structureUrl: string): string {
  const ext = (structureUrl.split(".").pop() ?? "cif").replace("cif", "mmcif");
  const q = ext.indexOf("?");
  return q >= 0 ? ext.substring(0, q) : ext;
}

const themeLookup: Record<string, string> = {
  default: "molstar/build/viewer/molstar.css",
  light: "molstar/build/viewer/theme/light.css",
  dark: "molstar/build/viewer/theme/dark.css",
  blue: "molstar/build/viewer/theme/blue.css",
};




export default function MolstarWrapper({
  useInterface = false,
  pdbId,
  // structuredObject,
  url,
  file,
  dimensions,
  className = "",
  showControls = true,
  showAxes = true,
  uiTheme = "light",
}: MolstarWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pluginRef = useRef<PluginRef>(null);
  const pluginInstanceRef = useRef<PluginContext | null>(null);
  const effectRunIdRef = useRef(0);
  const rootRef = useRef<ReturnType<typeof createRoot> | null>(null);

  const [initialized, setInitialized] = useState(false);

  const themeHref = themeLookup[uiTheme]


   // Removing other style sheets to ensure theme always the selected one.
    
  // import(`molstar/build/viewer/theme/${uiTheme}.css`);

  const isCurrentRun = (runId: number) => effectRunIdRef.current === runId;

  const loadStructure = async (
    plugin: NonNullable<PluginRef>,
    runIdRef: React.RefObject<number>,
    runId: number,
    opts: { pdbId?: string; url?: string; file?: MolstarWrapperProps["file"] }
  ) => {
    if (!plugin.builders?.data || !plugin.builders?.structure) return;
    plugin.clear();
    const { pdbId: pid, url: u, file: f } = opts;

    if (f) {
      const data = await plugin.builders.data.rawData({ data: f.filestring });
      if (runIdRef.current !== runId) return;
      const traj = await plugin.builders.structure.parseTrajectory(
        data,
        f.type as "mol" | "mmcif" | "pdb"
      );
      if (runIdRef.current !== runId) return;
      await plugin.builders.structure.hierarchy.applyPreset(traj, "default");
      return;
    }

    const structureUrl = getStructureUrl(pid, u);
    if (!structureUrl) return;

    const data = await plugin.builders.data.download(
      { url: structureUrl },
      { state: { isGhost: true } }
    );
    if (runIdRef.current !== runId) return;
    const format = getExtensionFromUrl(structureUrl);
    const traj = await plugin.builders.structure.parseTrajectory(
      data,
      format as "mmcif" | "pdb"
    );
    if (runIdRef.current !== runId) return;
    await plugin.builders.structure.hierarchy.applyPreset(traj, "default");
  };

  useEffect(() => {
    const runId = ++effectRunIdRef.current;
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container) return;

    (async () => {
      if (useInterface) {
        const spec = DefaultPluginUISpec();
        spec.layout = {
          initial: {
            isExpanded: false,
            controlsDisplay: "reactive",
            showControls,
          },
        };
        pluginRef.current = await createPluginUI({
          target: container,
          spec,
          render: (component, target) => {
            const root = createRoot(target as HTMLElement);
            rootRef.current = root;
            root.render(component);
          },
        });
        if (!isCurrentRun(runId)) return;
      } else {
        if (pluginInstanceRef.current === null) {
          const plugin = new PluginContext(DefaultPluginSpec());
          pluginRef.current = plugin;
          pluginInstanceRef.current = plugin;
          if (canvas) {
            await plugin.initViewerAsync(canvas, container);
            await plugin.init();
          }
        } else {
          pluginRef.current = pluginInstanceRef.current;
          if (canvas) {
            await pluginInstanceRef.current.initViewerAsync(canvas, container);
          }
        }
        if (!isCurrentRun(runId) || !pluginRef.current) return;
      }

      const plugin = pluginRef.current;
      if (plugin?.canvas3d && !showAxes) {
        plugin.canvas3d.setProps({
          camera: {
            helper: { axes: { name: "off", params: {} } },
          },
        });
      }

      await loadStructure(
        plugin,
        effectRunIdRef,
        runId,
        { pdbId, url, file }
      );
      if (!isCurrentRun(runId)) return;
      setInitialized(true);
    })();

    return () => {
      pluginRef.current = null;
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const plugin = pluginRef.current;
    if (!plugin) return;
    const runId = ++effectRunIdRef.current;
    loadStructure(plugin, effectRunIdRef, runId, { pdbId, url, file });
  }, [pdbId, url, file, initialized]);

  useEffect(() => {
    const container = containerRef.current;
    const plugin = pluginRef.current;
    if (!container || !plugin?.handleResize) return;
    const observer = new ResizeObserver(() => {
      pluginRef.current?.handleResize?.();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [initialized]);

  const width = dimensions?.[0] ?? "100%";
  const height = dimensions?.[1] ?? "100%";

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width,
    height,
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  // const themeLink = (
  //   <link
  //     key={uiTheme}
  //     rel="stylesheet"
  //     type="text/css"
  //     href={themeHref}
  //   />
  // );

  if (useInterface) {
    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className={className}
      >
        {/* {themeLink} */}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={className}
    >
      {/* {themeLink} */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
