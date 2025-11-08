// @ts-nocheck
interface LayerData {
  tileset: string;
  tilesetPath: string;
  data: number[][];
}

interface LevelData {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  layers: {
    [layerName: string]: LayerData | PlacedObject[];
  };
  lastModified?: string;
}

interface PlacedObject {
  id: string;
  type: "npc" | "interactive" | "spawn" | "portal";
  subtype: string;
  x: number;
  y: number;
  properties?: { [key: string]: any };
}

interface Asset {
  name: string;
  path: string;
  fullPath: string;
  size: number;
  lastModified: string;
  type: string;
}

interface GameLevel {
  id: string;
  name: string;
  width: number;
  height: number;
  lastModified: string;
  tileset: string | null;
}

class LevelEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tilesets: Map<string, HTMLImageElement> = new Map();
  private selectedTile = 0;
  private currentTool = "paint";
  private currentLayer = "background";
  private layerVisibility: Map<string, boolean> = new Map();

  // Selection state
  private isSelecting = false;
  private selectionStart = { x: 0, y: 0 };
  private selectionEnd = { x: 0, y: 0 };
  private clipboard: number[][] = [];
  private hasSelection = false;
  
  // Tileset selection state
  private tilesetSelecting = false;
  private tilesetSelection: {
    startTileX: number;
    startTileY: number;
    endTileX: number;
    endTileY: number;
    tiles: number[][];
    width: number;
    height: number;
  } | null = null;
  private tilesetClipboard: {
    tiles: number[][];
    width: number;
    height: number;
    directionX: number; // 1 for left-to-right, -1 for right-to-left
    directionY: number; // 1 for top-to-bottom, -1 for bottom-to-top
  } | null = null;
  private tilesetGridInfo: {
    tilesPerRow: number;
    tileSize: number;
    canvasSize: number;
  } | null = null;
  private zoom = 1;
  private showGrid = true;
  private levelData: LevelData;
  private isDragging = false;
  private isPanning = false;
  private isInitialClick = false;
  private lastX = 0;
  private lastY = 0;
  private panX = 0;
  private panY = 0;
  private selectedObject: { type: string; subtype: string } | null = null;
  private objectIdCounter = 0;
  private currentLevelId: string | null = null;
  private currentBuildingPosition: { x: number, y: number } | null = null;
  private modalJustClosed: boolean = false;
  private assets: Asset[] = [];
  private levels: GameLevel[] = [];
  private apiBase = "http://localhost:3001/api";

  constructor() {
    this.canvas = document.getElementById("levelCanvas") as HTMLCanvasElement;
    this.canvas.width = "100%";
    this.canvas.height = "100%";
    this.ctx = this.canvas.getContext("2d")!;

    this.levelData = {
      name: "Untitled Level",
      width: 50,
      height: 30,
      tileSize: 32,
      layers: {
        background: {
          tileset: "",
          tilesetPath: "",
          data: [],
        },
        collision: {
          tileset: "",
          tilesetPath: "",
          data: [],
        },
        objects: [],
      },
    };

    this.initializeLevel();
    this.setupEventListeners();
    this.setupSidebarResize();
    this.setupAccordions();
    this.setupModals();
    this.setupPortalModal();
    this.setupSpawnModal();
    this.setupLayerVisibilityControls();
    this.setupTilesetKeyboardShortcuts();
    this.updateToolbarInfo();
    this.resizeCanvas();
    this.loadLevels();
    this.render();
  }

  private initializeLevel() {
    Object.keys(this.levelData.layers).forEach((layerName) => {
      if (layerName !== "objects") {
        this.validateAndFixLayer(layerName);
        this.layerVisibility.set(layerName, true);
      }
    });
    if (!this.levelData.layers.objects) {
      this.levelData.layers.objects = [];
    }
  }

  private setupEventListeners() {
    // Asset management
    document
      .getElementById("openGallery")
      ?.addEventListener("click", () => this.openGallery());
    document
      .getElementById("closeGallery")
      ?.addEventListener("click", () => this.closeGallery());

    // Level management
    document
      .getElementById("levelSelect")
      ?.addEventListener("change", () => this.loadSelectedLevel());
    document
      .getElementById("loadLevel")
      ?.addEventListener("click", () => this.loadSelectedLevel());
    document
      .getElementById("saveLevel")
      ?.addEventListener("click", () => this.saveCurrentLevel());
    document
      .getElementById("saveLevelAs")
      ?.addEventListener("click", () => this.saveLevelAs());
    document
      .getElementById("deleteLevel")
      ?.addEventListener("click", () => this.deleteSelectedLevel());

    // Tools
    document
      .getElementById("paintTool")
      ?.addEventListener("click", () => this.setTool("paint"));
    document
      .getElementById("eraseTool")
      ?.addEventListener("click", () => this.setTool("erase"));
    document
      .getElementById("fillTool")
      ?.addEventListener("click", () => this.setTool("fill"));
    document
      .getElementById("objectTool")
      ?.addEventListener("click", () => this.setTool("object"));
    document
      .getElementById("selectTool")
      ?.addEventListener("click", () => this.setTool("select"));
    document
      .getElementById("replaceTool")
      ?.addEventListener("click", () => this.replaceAllTiles());

    // Selection tools
    document
      .getElementById("copyBtn")
      ?.addEventListener("click", () => this.copySelection());
    document
      .getElementById("pasteBtn")
      ?.addEventListener("click", () => this.pasteSelection());
    document
      .getElementById("deleteBtn")
      ?.addEventListener("click", () => this.deleteSelection());
    document
      .getElementById("replaceSelectionBtn")
      ?.addEventListener("click", () => this.replaceSelection());

    // Object palette
    document.querySelectorAll(".object-item").forEach((item) => {
      item.addEventListener("click", (e) =>
        this.selectObject(e.target as HTMLElement)
      );
    });

    // Layer selection
    const layerSelect = document.getElementById(
      "layerSelect"
    ) as HTMLSelectElement;
    layerSelect.addEventListener("change", (e) => {
      this.currentLayer = (e.target as HTMLSelectElement).value;
      this.validateAndFixLayer(this.currentLayer);
      this.updateTilesetForCurrentLayer();
      this.loadTilesetForCurrentLayer();
      this.updateToolbarInfo();
    });

    // Layer management
    document.getElementById("addLayerBtn")!.addEventListener("click", () => {
      const layerName = prompt("Enter layer name:");
      if (layerName && !this.levelData.layers[layerName]) {
        this.addLayer(layerName);
      }
    });

    document.getElementById("deleteLayerBtn")!.addEventListener("click", () => {
      if (
        this.currentLayer !== "objects" &&
        this.currentLayer !== "background"
      ) {
        this.deleteLayer(this.currentLayer);
      } else {
        alert("Cannot delete background or objects layer");
      }
    });

    this.setupLayerVisibilityControls();

    // Level controls
    document
      .getElementById("newLevel")
      ?.addEventListener("click", () => this.newLevel());
    document
      .getElementById("levelWidth")
      ?.addEventListener("change", () => this.resizeLevel());
    document
      .getElementById("levelHeight")
      ?.addEventListener("change", () => this.resizeLevel());

    // Zoom controls
    document
      .getElementById("zoomIn")
      ?.addEventListener("click", () => this.setZoom(this.zoom * 1.2));
    document
      .getElementById("zoomOut")
      ?.addEventListener("click", () => this.setZoom(this.zoom / 1.2));
    document
      .getElementById("gridToggle")
      ?.addEventListener("click", () => this.toggleGrid());

    // Canvas events
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("mousemove", (e) => {
      this.onMouseMove(e);
      this.updateCanvasTooltip(e);
    });
    this.canvas.addEventListener("mouseup", () => {
      if (this.isSelecting) {
        this.isSelecting = false;
        this.hasSelection = true;
        this.updateSelectionButtons();
      }
      this.isDragging = false;
      this.isPanning = false;
      this.canvas.style.cursor = "crosshair";
    });
    this.canvas.addEventListener("wheel", (e) => this.onWheel(e));
    this.canvas.addEventListener("contextmenu", (e) => this.onRightClick(e));

    // Window resize
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  private selectObject(element: HTMLElement) {
    document
      .querySelectorAll(".object-item")
      .forEach((item) => item.classList.remove("selected"));
    element.classList.add("selected");

    this.selectedObject = {
      type: element.dataset.type!,
      subtype: element.dataset.subtype!,
    };

    this.setTool("object");
  }

  private setTool(tool: string) {
    this.currentTool = tool;
    document
      .querySelectorAll('button[id$="Tool"]')
      .forEach((b) => b.classList.remove("active"));
    document.getElementById(tool + "Tool")?.classList.add("active");

    // Update cursor
    if (tool === "object") {
      this.canvas.style.cursor = "copy";
    } else {
      this.canvas.style.cursor = "crosshair";
    }
  }

  private async loadAssets() {
    try {
      const response = await fetch(`${this.apiBase}/assets`);
      this.assets = await response.json();
      this.populateAssetSelect();
    } catch (error) {
      console.error("Failed to load assets:", error);
      alert("Failed to load assets. Make sure the server is running.");
    }
  }

  private populateAssetSelect() {
    const select = document.getElementById("assetSelect") as HTMLSelectElement;
    select.innerHTML = '<option value="">Select Tileset...</option>';

    // Filter to only PNG files
    const pngAssets = this.assets.filter((asset) =>
      asset.name.toLowerCase().endsWith(".png")
    );

    pngAssets.forEach((asset) => {
      const option = document.createElement("option");
      option.value = asset.fullPath;
      option.textContent = `${asset.name} (${Math.round(asset.size / 1024)}KB)`;
      select.appendChild(option);
    });
  }

  private openGallery() {
    const modal = document.getElementById("galleryModal")!;
    this.loadAssets().then(() => {
      this.populateGallery();
      modal.style.display = "flex";

      // Add search functionality
      const searchInput = document.getElementById(
        "gallerySearch"
      ) as HTMLInputElement;
      searchInput.value = "";
      searchInput.addEventListener("input", () =>
        this.filterGallery(searchInput.value)
      );
    });
  }

  private populateGallery(searchTerm = "") {
    const grid = document.getElementById("galleryGrid")!;
    grid.innerHTML = "";

    // Filter to only PNG files and apply search
    const pngAssets = this.assets.filter(
      (asset) =>
        asset.name.toLowerCase().endsWith(".png") &&
        (searchTerm === "" ||
          asset.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Create preview for each tileset
    pngAssets.forEach((asset) => {
      const preview = document.createElement("div");
      preview.className = "tileset-preview";

      const img = document.createElement("img");
      img.src = `http://localhost:3001${asset.fullPath}`;
      img.alt = asset.name;

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = asset.name;

      preview.appendChild(img);
      preview.appendChild(name);

      preview.addEventListener("click", () => {
        this.loadTilesetFromAsset(asset.fullPath);
        this.closeGallery();
      });

      grid.appendChild(preview);
    });
  }

  private filterGallery(searchTerm: string) {
    this.populateGallery(searchTerm);
  }

  private setupSidebarResize() {
    let isResizing = false;
    let currentSidebar: HTMLElement | null = null;

    // Left sidebar resize handle
    const leftHandle = document.querySelector(
      ".resize-handle-right"
    ) as HTMLElement;
    const leftSidebar = document.querySelector(".sidebar") as HTMLElement;

    leftHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      currentSidebar = leftSidebar;
      document.body.style.cursor = "ew-resize";
      e.preventDefault();
    });

    // Right sidebar resize handle
    const rightHandle = document.querySelector(
      ".resize-handle-left"
    ) as HTMLElement;
    const rightSidebar = document.querySelector(
      ".tileset-sidebar"
    ) as HTMLElement;

    rightHandle.addEventListener("mousedown", (e) => {
      isResizing = true;
      currentSidebar = rightSidebar;
      document.body.style.cursor = "ew-resize";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing || !currentSidebar) return;

      if (currentSidebar === leftSidebar) {
        // Left sidebar - resize from right edge
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        currentSidebar.style.width = `${newWidth}px`;
      } else if (currentSidebar === rightSidebar) {
        // Right sidebar - resize from left edge, no max width limit
        const newWidth = Math.max(200, window.innerWidth - e.clientX);
        currentSidebar.style.width = `${newWidth}px`;
        // Regenerate tileset grid with new width
        if (this.currentTileset) {
          this.generateTilesetGrid(this.currentTileset);
        }
      }
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
      currentSidebar = null;
      document.body.style.cursor = "";
    });
  }

  private setupAccordions() {
    document.querySelectorAll(".accordion-header").forEach((header) => {
      header.addEventListener("click", () => {
        const target = header.getAttribute("data-target");
        const content = document.getElementById(target!);
        const toggle = header.querySelector(".accordion-toggle");
        const isActive = header.classList.contains("active");

        if (isActive) {
          header.classList.remove("active");
          content!.style.display = "none";
          toggle!.textContent = "▶";
        } else {
          header.classList.add("active");
          content!.style.display = "block";
          toggle!.textContent = "▼";
        }
      });
    });
  }

  private setupPortalModal() {
    const confirmBtn = document.getElementById('confirmPortal')!;
    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.currentBuildingPosition) {
        const portalId = (document.getElementById('portalId') as HTMLInputElement).value;
        const targetScene = (document.getElementById('targetScene') as HTMLSelectElement).value;
        const targetPortalId = (document.getElementById('targetPortalId') as HTMLInputElement).value;
        
        this.placePortalWithProperties(
          this.currentBuildingPosition.x, 
          this.currentBuildingPosition.y,
          portalId,
          targetScene,
          targetPortalId
        );
        
        document.getElementById('portalModal')!.style.display = 'none';
        this.currentBuildingPosition = null;
        
        // Prevent immediate re-opening
        this.modalJustClosed = true;
        setTimeout(() => {
          this.modalJustClosed = false;
        }, 200);
      }
    });
  }

  private setupSpawnModal() {
    const confirmBtn = document.getElementById('confirmSpawn')!;
    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (this.currentBuildingPosition) {
        const spawnId = (document.getElementById('spawnId') as HTMLInputElement).value;
        const isDefault = (document.getElementById('isDefaultSpawn') as HTMLInputElement).checked;
        
        this.placeSpawnWithProperties(
          this.currentBuildingPosition.x, 
          this.currentBuildingPosition.y,
          spawnId,
          isDefault
        );
        
        document.getElementById('spawnModal')!.style.display = 'none';
        this.currentBuildingPosition = null;
        
        // Brief delay to prevent immediate re-triggering
        setTimeout(() => {
          this.isDragging = false;
        }, 100);
      }
    });
  }

  private setupBuildingModal() {
    const confirmBtn = document.getElementById('confirmBuilding')!;
    confirmBtn.addEventListener('click', () => {
      if (this.currentBuildingPosition) {
        const name = (document.getElementById('buildingName') as HTMLInputElement).value;
        const scene = (document.getElementById('buildingScene') as HTMLSelectElement).value;
        
        this.placeBuildingWithProperties(
          this.currentBuildingPosition.x, 
          this.currentBuildingPosition.y,
          name,
          scene
        );
        
        document.getElementById('buildingModal')!.style.display = 'none';
        this.currentBuildingPosition = null;
      }
    });
  }

  private setupModals() {
    const modal = document.getElementById("levelModal")!;
    const closeBtn = modal.querySelector(".close")!;
    const cancelBtn = document.getElementById("modalCancel")!;

    closeBtn.addEventListener("click", () => (modal.style.display = "none"));
    cancelBtn.addEventListener("click", () => (modal.style.display = "none"));

    // Close modal when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }

  private updateToolbarInfo() {
    const levelLayerEl = document.getElementById("currentLevelLayer")!;
    const levelName = this.levelData?.name || "Untitled";
    const layerName = this.currentLayer || "Background";
    levelLayerEl.textContent = `${levelName} - ${layerName}`;
  }

  private validateAndFixLayer(layerName: string): boolean {
    const layer = this.levelData.layers[layerName];
    if (!layer || typeof layer !== "object") return false;

    // Ensure layer has required properties
    if (
      !("data" in layer) ||
      !Array.isArray(layer.data) ||
      layer.data.length !== this.levelData.height
    ) {
      layer.data = Array(this.levelData.height)
        .fill(null)
        .map(() => Array(this.levelData.width).fill(-1));
    }

    // Validate each row
    for (let y = 0; y < this.levelData.height; y++) {
      if (
        !Array.isArray(layer.data[y]) ||
        layer.data[y].length !== this.levelData.width
      ) {
        layer.data[y] = Array(this.levelData.width).fill(-1);
      }
    }

    return true;
  }

  private closeGallery() {
    const modal = document.getElementById("galleryModal")!;
    modal.style.display = "none";
  }

  private async loadLevels() {
    try {
      const response = await fetch(`${this.apiBase}/levels`);
      this.levels = await response.json();
      this.populateLevelSelect();
    } catch (error) {
      console.error("Failed to load levels:", error);
    }
  }

  private populateLevelSelect() {
    const select = document.getElementById("levelSelect") as HTMLSelectElement;
    select.innerHTML = '<option value="">New Level...</option>';

    this.levels.forEach((level) => {
      const option = document.createElement("option");
      option.value = level.id;
      option.textContent = `${level.name} (${level.width}x${level.height})`;
      select.appendChild(option);
    });
  }

  private async loadSelectedLevel() {
    const select = document.getElementById("levelSelect") as HTMLSelectElement;
    const levelId = select.value;

    if (!levelId) {
      alert("Please select a level to load");
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/levels/${levelId}`);
      if (!response.ok) throw new Error("Level not found");

      this.levelData = await response.json();
      this.currentLevelId = levelId;

      // Validate and fix all layers
      Object.keys(this.levelData.layers).forEach((layerName) => {
        if (layerName !== "objects") {
          this.validateAndFixLayer(layerName);
          this.layerVisibility.set(layerName, true);
        }
      });

      // Update layer select with actual layers from the level
      this.updateLayerSelect();

      // Load tilesets for each layer
      for (const [layerName, layer] of Object.entries(this.levelData.layers)) {
        if (
          layerName !== "objects" &&
          typeof layer === "object" &&
          "tilesetPath" in layer &&
          layer.tilesetPath
        ) {
          console.log(`Loading tileset for ${layerName}: ${layer.tilesetPath}`);
          await this.loadTilesetFromPath(layer.tilesetPath);
        }
      }

      // Setup layer controls
      this.setupLayerVisibilityControls();
      this.updateTilesetForCurrentLayer();
      this.updateToolbarInfo();

      // Load tilesets for each layer - this section is now handled above
      // No need for this old code since we load tilesets in the previous loop

      this.render();
    } catch (error) {
      console.error("Failed to load level:", error);
      alert("Failed to load level");
    }
  }

  private async saveCurrentLevel() {
    let levelName = this.levelData?.name;
    
    if (!levelName || levelName === "Untitled") {
      levelName = prompt("Enter level name:");
      if (!levelName?.trim()) {
        alert("Please enter a level name");
        return;
      }
      levelName = levelName.trim();
    }

    const levelId = this.currentLevelId || this.sanitizeLevelName(levelName);
    await this.saveLevel(levelId, levelName);
  }

  private async saveLevelAs() {
    const levelName = prompt("Enter new level name:");
    if (!levelName) return;

    const levelId = this.sanitizeLevelName(levelName);
    this.currentLevelId = levelId;
    await this.saveLevel(levelId, levelName);
  }

  private async saveLevel(levelId: string, levelName: string) {
    try {
      this.levelData.name = levelName;

      const response = await fetch(`${this.apiBase}/levels/${levelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.levelData),
      });

      if (!response.ok) throw new Error("Failed to save");

      await this.loadLevels(); // Refresh level list
      alert(`Saved level: ${levelName}`);
    } catch (error) {
      console.error("Failed to save level:", error);
      alert("Failed to save level");
    }
  }

  private async deleteSelectedLevel() {
    const select = document.getElementById("levelSelect") as HTMLSelectElement;
    const levelId = select.value;

    if (!levelId) {
      alert("Please select a level to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete level "${levelId}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/levels/${levelId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      await this.loadLevels(); // Refresh level list
      if (this.currentLevelId === levelId) {
        this.currentLevelId = null;
        this.newLevel();
      }
      alert("Level deleted successfully");
    } catch (error) {
      console.error("Failed to delete level:", error);
      alert("Failed to delete level");
    }
  }

  private sanitizeLevelName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "_");
  }

  private async loadTilesetFromAsset(assetPath: string) {
    if (!assetPath) return;

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          this.tilesets.set(assetPath, img);
          this.generateTilesetGrid(img);
          this.render();
          resolve();
        };
        img.onerror = () => reject(new Error("Failed to load tileset"));
        img.src = `http://localhost:3001${assetPath}`;
      });

      // Update current layer's tileset
      const layer = this.levelData.layers[this.currentLayer];
      if (layer && typeof layer === "object" && "tileset" in layer) {
        layer.tileset = assetPath;
        layer.tilesetPath = assetPath;
      }
    } catch (error) {
      console.error("Failed to load tileset:", error);
      alert("Failed to load tileset");
    }
  }

  private setupLayerVisibilityControls() {
    const container = document.getElementById("layerToggles");
    if (!container) return;

    container.innerHTML = "";
    Object.keys(this.levelData.layers).forEach((layerName) => {
      if (layerName === "objects") return;

      const div = document.createElement("div");
      div.classList.add("layer-viz");
      div.style.marginBottom = "5px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `layer-${layerName}`;
      checkbox.checked = this.layerVisibility.get(layerName) ?? true;
      checkbox.addEventListener("change", () => {
        this.layerVisibility.set(layerName, checkbox.checked);
        this.render();
      });

      const label = document.createElement("label");
      label.htmlFor = `layer-${layerName}`;
      label.textContent =
        layerName.charAt(0).toUpperCase() + layerName.slice(1);
      label.style.marginLeft = "5px";

      div.appendChild(checkbox);
      div.appendChild(label);
      container.appendChild(div);
    });
  }

  private updateTilesetForCurrentLayer() {
    const layer = this.levelData.layers[this.currentLayer];
    if (
      layer &&
      typeof layer === "object" &&
      "tilesetPath" in layer &&
      layer.tilesetPath
    ) {
      this.loadTilesetFromPath(layer.tilesetPath);
    }
  }

  private async loadTilesetFromPath(path: string): Promise<void> {
    if (this.tilesets.has(path)) {
      const tileset = this.tilesets.get(path)!;
      if (tileset !== null) {
        this.generateTilesetGrid(tileset);
      }
      return;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.tilesets.set(path, img);
        this.generateTilesetGrid(img);
        this.render();
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load tileset: ${path}`);
        this.tilesets.set(path, null as any); // Mark as failed
        resolve();
      };
      // Use the correct base URL for assets (not /api)
      img.src = `http://localhost:3001${path}`;
    });
  }

  private addLayer(layerName: string) {
    // Create new layer with empty data
    this.levelData.layers[layerName] = {
      tileset: "",
      tilesetPath: "",
      data: Array(this.levelData.height)
        .fill(null)
        .map(() => Array(this.levelData.width).fill(-1)),
    };

    // Set visibility
    this.layerVisibility.set(layerName, true);

    // Update UI
    this.updateLayerSelect();
    this.setupLayerVisibilityControls();

    // Select the new layer
    const layerSelect = document.getElementById(
      "layerSelect"
    ) as HTMLSelectElement;
    layerSelect.value = layerName;
    this.currentLayer = layerName;

    // Load tileset for new layer
    this.loadTilesetForCurrentLayer();

    this.render();
  }

  private deleteLayer(layerName: string) {
    if (confirm(`Delete layer "${layerName}"?`)) {
      delete this.levelData.layers[layerName];
      this.layerVisibility.delete(layerName);

      // Update UI
      this.updateLayerSelect();
      this.setupLayerVisibilityControls();

      // Select background layer
      const layerSelect = document.getElementById(
        "layerSelect"
      ) as HTMLSelectElement;
      layerSelect.value = "background";
      this.currentLayer = "background";

      // Load tileset for background layer
      this.loadTilesetForCurrentLayer();

      this.render();
    }
  }

  private updateLayerSelect() {
    const layerSelect = document.getElementById(
      "layerSelect"
    ) as HTMLSelectElement;
    const currentValue = layerSelect.value;

    layerSelect.innerHTML = "";

    Object.keys(this.levelData.layers).forEach((layerName) => {
      const option = document.createElement("option");
      option.value = layerName;
      option.textContent =
        layerName.charAt(0).toUpperCase() + layerName.slice(1);
      layerSelect.appendChild(option);
    });

    // Restore selection if still valid
    if (this.levelData.layers[currentValue]) {
      layerSelect.value = currentValue;
    }
  }

  private loadTilesetForCurrentLayer() {
    const layer = this.levelData.layers[this.currentLayer];
    if (
      layer &&
      typeof layer === "object" &&
      "tilesetPath" in layer &&
      layer.tilesetPath
    ) {
      this.loadTilesetFromPath(layer.tilesetPath);
    } else {
      // Clear tileset display for new/empty layers
      document.getElementById("tilesetGrid")!.innerHTML = "";
      document.getElementById("currentTilesetName")!.textContent =
        "No tileset loaded";
    }
  }

  private getCurrentLayerTilesetPath(): string {
    const layer = this.levelData.layers[this.currentLayer];
    if (layer && typeof layer === "object" && "tilesetPath" in layer) {
      return layer.tilesetPath;
    }
    return "";
  }

  private generateTilesetGrid(tileset?: HTMLImageElement) {
    const img = tileset || this.tilesets.get(this.getCurrentLayerTilesetPath());
    if (!img) return;

    const grid = document.getElementById("tilesetGrid")!;
    grid.innerHTML = "";

    // Use the level's actual tile size, not user input
    const tileSize = this.levelData.tileSize;
    const tilesX = Math.floor(img.width / tileSize);
    const tilesY = Math.floor(img.height / tileSize);
    
    // Store grid info for selection calculations
    this.tilesetGridInfo = {
      tilesPerRow: tilesX,
      tileSize: tileSize,
      canvasSize: 40
    };

    // Update tileset name display
    const layer = this.levelData.layers[this.currentLayer];
    if (layer && typeof layer === "object" && "tilesetPath" in layer) {
      const tilesetName = layer.tilesetPath.split("/").pop() || "Unknown";
      document.getElementById("currentTilesetName")!.textContent = tilesetName;
    }

    for (let y = 0; y < tilesY; y++) {
      for (let x = 0; x < tilesX; x++) {
        const canvas = document.createElement("canvas");
        canvas.width = 40;
        canvas.height = 40;
        canvas.className = "tile";
        canvas.dataset.tileX = x.toString();
        canvas.dataset.tileY = y.toString();
        canvas.dataset.tileId = (y * tilesX + x).toString();

        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          img,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize,
          0,
          0,
          40,
          40
        );

        const tileId = y * tilesX + x;
        canvas.addEventListener("click", () => this.selectTile(tileId, canvas));
        canvas.addEventListener("mouseenter", () => {
          this.showTileInfo(`Tile ID: ${tileId}`);
          if (!this.tilesetSelecting) {
            canvas.style.border = '2px solid #95a5a6';
          }
        });
        canvas.addEventListener("mouseleave", () => {
          this.hideTileInfo();
          if (!this.tilesetSelecting) {
            canvas.style.border = '2px solid transparent';
          }
        });
        grid.appendChild(canvas);
      }
    }
    
    // Add selection event listeners to the grid
    this.setupTilesetSelection(grid);
  }

  private setupTilesetSelection(grid: HTMLElement) {
    let startX = 0, startY = 0;
    
    grid.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click
      
      const rect = grid.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      
      const startTile = this.getTileFromPosition(startX, startY);
      if (!startTile) return;
      
      this.tilesetSelecting = true;
      this.tilesetSelection = {
        startTileX: startTile.x,
        startTileY: startTile.y,
        endTileX: startTile.x,
        endTileY: startTile.y,
        tiles: [],
        width: 1,
        height: 1
      };
      
      this.highlightSelectedTiles();
      e.preventDefault();
    });
    
    grid.addEventListener('mousemove', (e) => {
      if (!this.tilesetSelecting || !this.tilesetSelection) return;
      
      const rect = grid.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const endTile = this.getTileFromPosition(currentX, currentY);
      if (endTile) {
        this.tilesetSelection.endTileX = endTile.x;
        this.tilesetSelection.endTileY = endTile.y;
        this.highlightSelectedTiles();
      }
      // If endTile is null (mouse in gap), keep previous selection
    });
    
    grid.addEventListener('mouseup', () => {
      if (this.tilesetSelecting && this.tilesetSelection) {
        this.finalizeTilesetSelection();
      }
      this.tilesetSelecting = false;
    });
  }

  private getTileFromPosition(x: number, y: number): {x: number, y: number} | null {
    // Get the actual element at this position
    const grid = document.getElementById("tilesetGrid")!;
    const rect = grid.getBoundingClientRect();
    const element = document.elementFromPoint(rect.left + x, rect.top + y);
    
    if (!element || !element.classList.contains('tile')) return null;
    
    const tileX = parseInt(element.getAttribute('data-tile-x') || '0');
    const tileY = parseInt(element.getAttribute('data-tile-y') || '0');
    
    return { x: tileX, y: tileY };
  }

  private finalizeTilesetSelection() {
    if (!this.tilesetSelection || !this.tilesetGridInfo) return;
    
    // Preserve original direction - don't normalize to min/max
    const startX = this.tilesetSelection.startTileX;
    const startY = this.tilesetSelection.startTileY;
    const endX = this.tilesetSelection.endTileX;
    const endY = this.tilesetSelection.endTileY;
    
    this.tilesetSelection.width = Math.abs(endX - startX) + 1;
    this.tilesetSelection.height = Math.abs(endY - startY) + 1;
    this.tilesetSelection.tiles = [];
    
    // Store tiles in the order they were selected (preserving direction)
    for (let row = 0; row < this.tilesetSelection.height; row++) {
      const tileRow: number[] = [];
      for (let col = 0; col < this.tilesetSelection.width; col++) {
        // Calculate actual tile position based on selection direction
        let actualX, actualY;
        
        if (endX >= startX) {
          actualX = startX + col; // Left to right
        } else {
          actualX = startX - col; // Right to left
        }
        
        if (endY >= startY) {
          actualY = startY + row; // Top to bottom
        } else {
          actualY = startY - row; // Bottom to top
        }
        
        const tileId = actualY * this.tilesetGridInfo.tilesPerRow + actualX;
        tileRow.push(tileId);
      }
      this.tilesetSelection.tiles.push(tileRow);
    }
    
    this.highlightSelectedTiles();
  }

  private highlightSelectedTiles() {
    // Clear previous highlights
    document.querySelectorAll('.tile').forEach(tile => {
      (tile as HTMLElement).style.border = '2px solid transparent';
    });
    
    if (!this.tilesetSelection) return;
    
    // Highlight selected tiles
    const startX = this.tilesetSelection.startTileX;
    const startY = this.tilesetSelection.startTileY;
    const endX = this.tilesetSelection.endTileX;
    const endY = this.tilesetSelection.endTileY;
    
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const tile = document.querySelector(`[data-tile-x="${x}"][data-tile-y="${y}"]`) as HTMLElement;
        if (tile) {
          tile.style.border = '2px solid #3498db';
        }
      }
    }
  }

  private setupTilesetKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && this.tilesetSelection) {
        e.preventDefault();
        this.copyTilesetSelection();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && this.tilesetClipboard) {
        e.preventDefault();
        // Paste will happen on next map click
      }
    });
  }

  private copyTilesetSelection() {
    if (!this.tilesetSelection) return;
    
    const startX = this.tilesetSelection.startTileX;
    const startY = this.tilesetSelection.startTileY;
    const endX = this.tilesetSelection.endTileX;
    const endY = this.tilesetSelection.endTileY;
    
    this.tilesetClipboard = {
      tiles: [...this.tilesetSelection.tiles.map(row => [...row])],
      width: this.tilesetSelection.width,
      height: this.tilesetSelection.height,
      directionX: endX >= startX ? 1 : -1,
      directionY: endY >= startY ? 1 : -1
    };
    
    this.showCopyPreview();
  }

  private showCopyPreview() {
    if (!this.tilesetClipboard || !this.tilesetGridInfo) return;
    
    // Create preview alert
    const alert = document.createElement('div');
    alert.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: #2c3e50;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    
    const text = document.createElement('span');
    text.textContent = `Copied ${this.tilesetClipboard.width}×${this.tilesetClipboard.height} tiles`;
    
    const preview = document.createElement('canvas');
    preview.width = this.tilesetClipboard.width * 20;
    preview.height = this.tilesetClipboard.height * 20;
    preview.style.border = '1px solid #34495e';
    
    const ctx = preview.getContext('2d')!;
    const currentTileset = this.tilesets.get(this.getCurrentLayerTilesetPath());
    
    if (currentTileset) {
      for (let row = 0; row < this.tilesetClipboard.height; row++) {
        for (let col = 0; col < this.tilesetClipboard.width; col++) {
          const tileId = this.tilesetClipboard.tiles[row][col];
          const tileX = tileId % this.tilesetGridInfo.tilesPerRow;
          const tileY = Math.floor(tileId / this.tilesetGridInfo.tilesPerRow);
          
          // Draw in preview respecting direction
          let drawX, drawY;
          
          if (this.tilesetClipboard.directionX === 1) {
            drawX = col * 20; // Left to right
          } else {
            drawX = (this.tilesetClipboard.width - 1 - col) * 20; // Right to left
          }
          
          if (this.tilesetClipboard.directionY === 1) {
            drawY = row * 20; // Top to bottom
          } else {
            drawY = (this.tilesetClipboard.height - 1 - row) * 20; // Bottom to top
          }
          
          ctx.drawImage(
            currentTileset,
            tileX * this.tilesetGridInfo.tileSize,
            tileY * this.tilesetGridInfo.tileSize,
            this.tilesetGridInfo.tileSize,
            this.tilesetGridInfo.tileSize,
            drawX,
            drawY,
            20,
            20
          );
        }
      }
    }
    
    alert.appendChild(text);
    alert.appendChild(preview);
    document.body.appendChild(alert);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.parentNode.removeChild(alert);
      }
    }, 5000);
  }

  private applyTilesetSelectionToMap(mapX: number, mapY: number) {
    if (!this.tilesetClipboard) return;
    
    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== 'object' || !('data' in layer)) return;
    
    for (let row = 0; row < this.tilesetClipboard.height; row++) {
      for (let col = 0; col < this.tilesetClipboard.width; col++) {
        // Apply direction when pasting
        let targetX, targetY;
        
        if (this.tilesetClipboard.directionX === 1) {
          targetX = mapX + col; // Left to right
        } else {
          targetX = mapX - col; // Right to left
        }
        
        if (this.tilesetClipboard.directionY === 1) {
          targetY = mapY + row; // Top to bottom
        } else {
          targetY = mapY - row; // Bottom to top
        }
        
        if (targetX >= 0 && targetX < this.levelData.width && 
            targetY >= 0 && targetY < this.levelData.height &&
            layer.data[targetY] && layer.data[targetY][targetX] !== undefined) {
          layer.data[targetY][targetX] = this.tilesetClipboard.tiles[row][col];
        }
      }
    }
    
    this.render();
  }

  private selectTile(tileId: number, element: HTMLCanvasElement) {
    document
      .querySelectorAll(".tile")
      .forEach((t) => t.classList.remove("selected"));
    element.classList.add("selected");
    this.selectedTile = tileId;
  }

  private onMouseDown(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();

    if (event.button === 2) {
      // Right click for panning
      event.preventDefault();
      event.stopPropagation();
      this.isPanning = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.canvas.style.cursor = "grabbing";
      return;
    }

    const tileSize = this.levelData.tileSize * this.zoom;
    const levelWidth = this.levelData.width * tileSize;
    const levelHeight = this.levelData.height * tileSize;
    const offsetX = (this.canvas.width - levelWidth) / 2 + this.panX;
    const offsetY = (this.canvas.height - levelHeight) / 2 + this.panY;

    const x = Math.floor((event.clientX - rect.left - offsetX) / tileSize);
    const y = Math.floor((event.clientY - rect.top - offsetY) / tileSize);

    if (this.currentTool === "select") {
      this.isSelecting = true;
      this.selectionStart = { x, y };
      this.selectionEnd = { x, y };
      this.hasSelection = false;
    } else {
      this.isDragging = true;
      this.isInitialClick = true;
      this.paintTile(x, y);
    }

    this.lastX = x;
    this.lastY = y;
  }

  private onMouseMove(event: MouseEvent) {
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastX;
      const deltaY = event.clientY - this.lastY;
      this.panX += deltaX;
      this.panY += deltaY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.render();
      return;
    }

    if (this.isSelecting) {
      const rect = this.canvas.getBoundingClientRect();
      const tileSize = this.levelData.tileSize * this.zoom;
      const levelWidth = this.levelData.width * tileSize;
      const levelHeight = this.levelData.height * tileSize;
      const offsetX = (this.canvas.width - levelWidth) / 2 + this.panX;
      const offsetY = (this.canvas.height - levelHeight) / 2 + this.panY;

      const x = Math.floor((event.clientX - rect.left - offsetX) / tileSize);
      const y = Math.floor((event.clientY - rect.top - offsetY) / tileSize);

      this.selectionEnd = { x, y };
      this.render();
      return;
    }

    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const tileSize = this.levelData.tileSize * this.zoom;
    const levelWidth = this.levelData.width * tileSize;
    const levelHeight = this.levelData.height * tileSize;
    const offsetX = (this.canvas.width - levelWidth) / 2 + this.panX;
    const offsetY = (this.canvas.height - levelHeight) / 2 + this.panY;

    const x = Math.floor((event.clientX - rect.left - offsetX) / tileSize);
    const y = Math.floor((event.clientY - rect.top - offsetY) / tileSize);

    if (x !== this.lastX || y !== this.lastY) {
      this.paintTile(x, y);
      this.lastX = x;
      this.lastY = y;
    }
  }

  private paintTile(x: number, y: number) {
    if (
      x < 0 ||
      y < 0 ||
      x >= this.levelData.width ||
      y >= this.levelData.height
    )
      return;

    if (this.currentTool === "replaceFrom") {
      this.replaceAllFromTile(x, y);
      return;
    }

    if (this.currentTool === "object" && this.selectedObject) {
      // Only place object on initial click, not on drag
      if (this.isInitialClick) {
        this.placeObject(x, y);
        this.isInitialClick = false;
      }
    } else {
      const layer = this.levelData.layers[this.currentLayer];
      if (
        layer &&
        typeof layer === "object" &&
        "data" in layer &&
        layer.data &&
        layer.data[y]
      ) {
        if (this.currentTool === "paint") {
          // Use clipboard if available, otherwise single tile
          if (this.tilesetClipboard && this.tilesetClipboard.tiles.length > 0) {
            this.applyTilesetSelectionToMap(x, y);
          } else {
            layer.data[y][x] = this.selectedTile;
          }
        } else if (this.currentTool === "erase") {
          layer.data[y][x] = -1;
        }
      }
    }

    this.render();
  }

  private placeObject(x: number, y: number) {
    if (!this.selectedObject) return;

    // Prevent modal from reopening immediately after closing
    if (this.modalJustClosed) return;

    // Remove existing object at this position
    this.levelData.layers.objects = this.levelData.layers.objects.filter(
      (obj) => !(obj.x === x && obj.y === y)
    );

    // Handle portal placement with modal
    if (this.selectedObject.type === "portal") {
      this.currentBuildingPosition = { x, y };
      document.getElementById('portalModal')!.style.display = 'flex';
      return;
    }

    // Handle spawn placement with modal (except player spawn)
    if (this.selectedObject.type === "spawn" && this.selectedObject.subtype === "portal") {
      this.currentBuildingPosition = { x, y };
      document.getElementById('spawnModal')!.style.display = 'flex';
      return;
    }

    // Create regular object (player spawn, NPCs, etc.)
    const newObject: PlacedObject = {
      id: `obj_${this.objectIdCounter++}`,
      type: this.selectedObject.type as any,
      subtype: this.selectedObject.subtype,
      x: x,
      y: y,
      properties: {},
    };

    this.levelData.layers.objects.push(newObject);
  }

  private placePortalWithProperties(x: number, y: number, portalId: string, targetScene: string, targetPortalId: string) {
    const newObject: PlacedObject = {
      id: `portal_${this.objectIdCounter++}`,
      type: "portal",
      subtype: "scene_exit",
      x: x,
      y: y,
      properties: {
        portalId: portalId,
        targetScene: targetScene,
        targetPortalId: targetPortalId
      },
    };

    this.levelData.layers.objects.push(newObject);
    this.render();
  }

  private placeSpawnWithProperties(x: number, y: number, spawnId: string, isDefault: boolean) {
    const newObject: PlacedObject = {
      id: `spawn_${this.objectIdCounter++}`,
      type: "spawn",
      subtype: "portal",
      x: x,
      y: y,
      properties: {
        spawnId: spawnId,
        isDefault: isDefault
      },
    };

    this.levelData.layers.objects.push(newObject);
    this.render();
  }

  private onRightClick(event: MouseEvent) {
    event.preventDefault();

    if (this.isPanning) return; // Don't remove objects while panning

    const rect = this.canvas.getBoundingClientRect();
    const tileSize = this.levelData.tileSize * this.zoom;
    const levelWidth = this.levelData.width * tileSize;
    const levelHeight = this.levelData.height * tileSize;
    const offsetX = (this.canvas.width - levelWidth) / 2 + this.panX;
    const offsetY = (this.canvas.height - levelHeight) / 2 + this.panY;

    const x = Math.floor((event.clientX - rect.left - offsetX) / tileSize);
    const y = Math.floor((event.clientY - rect.top - offsetY) / tileSize);

    // Remove object at this position
    const initialLength = this.levelData.layers.objects.length;
    this.levelData.layers.objects = this.levelData.layers.objects.filter(
      (obj) => !(obj.x === x && obj.y === y)
    );

    if (this.levelData.layers.objects.length < initialLength) {
      this.render();
    }
  }

  private setZoom(newZoom: number) {
    this.zoom = Math.max(0.1, Math.min(5, newZoom));
    document.getElementById("zoomLevel")!.textContent =
      Math.round(this.zoom * 100) + "%";
    this.render();
  }

  private toggleGrid() {
    this.showGrid = !this.showGrid;
    this.render();
  }

  private resizeLevel() {
    const newWidth = parseInt(
      (document.getElementById("levelWidth") as HTMLInputElement).value
    );
    const newHeight = parseInt(
      (document.getElementById("levelHeight") as HTMLInputElement).value
    );

    if (newWidth < 1 || newHeight < 1) return;

    const oldWidth = this.levelData.width;
    const oldHeight = this.levelData.height;

    // Resize background layer
    const newBackground = Array(newHeight)
      .fill(null)
      .map(() => Array(newWidth).fill(-1));
    if (this.levelData.layers.background?.data) {
      for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
        for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
          if (this.levelData.layers.background.data[y]?.[x] !== undefined) {
            newBackground[y][x] = this.levelData.layers.background.data[y][x];
          }
        }
      }
    }

    // Resize collision layer
    const newCollision = Array(newHeight)
      .fill(null)
      .map(() => Array(newWidth).fill(-1));
    if (this.levelData.layers.collision?.data) {
      for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
        for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
          if (this.levelData.layers.collision.data[y]?.[x] !== undefined) {
            newCollision[y][x] = this.levelData.layers.collision.data[y][x];
          }
        }
      }
    }

    // Filter objects that are now outside bounds
    const validObjects = this.levelData.layers.objects.filter(
      (obj) => obj.x < newWidth && obj.y < newHeight
    );

    // Update level data
    this.levelData.width = newWidth;
    this.levelData.height = newHeight;
    this.levelData.layers.background.data = newBackground;
    this.levelData.layers.collision.data = newCollision;
    this.levelData.layers.objects = validObjects;

    this.render();
  }

  private newLevel() {
    const width = parseInt(
      (document.getElementById("levelWidth") as HTMLInputElement).value
    );
    const height = parseInt(
      (document.getElementById("levelHeight") as HTMLInputElement).value
    );

    this.levelData = {
      name: "Untitled Level",
      width: width,
      height: height,
      tileSize: 32,
      layers: {
        background: {
          tileset: "",
          tilesetPath: "",
          data: [],
        },
        collision: {
          tileset: "",
          tilesetPath: "",
          data: [],
        },
        objects: [],
      },
    };

    this.currentLevelId = null;
    this.initializeLevel();
    this.updateLayerSelect();
    this.setupLayerVisibilityControls();
    (document.getElementById("levelName") as HTMLInputElement).value = "";
    (document.getElementById("levelSelect") as HTMLSelectElement).value = "";
    this.render();
  }

  private resizeCanvas() {
    const container = this.canvas.parentElement!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.render();
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.98 : 1.02; // Much smaller steps
    this.setZoom(this.zoom * zoomFactor);
  }

  private render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const tileSize = this.levelData.tileSize * this.zoom;
    const levelWidth = this.levelData.width * tileSize;
    const levelHeight = this.levelData.height * tileSize;

    // Center the level in the canvas with pan offset
    const offsetX = (this.canvas.width - levelWidth) / 2 + this.panX;
    const offsetY = (this.canvas.height - levelHeight) / 2 + this.panY;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    // Render all visible layers
    Object.keys(this.levelData.layers).forEach((layerName) => {
      if (layerName === "objects") return;
      if (this.layerVisibility.get(layerName)) {
        this.renderLayer(layerName, tileSize);
      }
    });

    // Render collision layer semi-transparent if selected
    if (
      this.currentLayer === "collision" &&
      this.layerVisibility.get("collision")
    ) {
      this.ctx.globalAlpha = 0.5;
      this.renderLayer("collision", tileSize);
      this.ctx.globalAlpha = 1;
    }

    // Render objects
    this.renderObjects(tileSize);

    // Render selection
    if (this.hasSelection || this.isSelecting) {
      this.renderSelection(tileSize);
    }

    // Render grid
    if (this.showGrid) {
      this.renderGrid(tileSize);
    }

    this.ctx.restore();
  }

  private renderObjects(tileSize: number) {
    const objectIcons = {
      "npc-merchant": "👤",
      "npc-guard": "🛡️",
      "npc-villager": "👥",
      "interactive-chest": "📦",
      "interactive-door": "🚪",
      "interactive-sign": "📋",
      "spawn-player": "⭐",
      "spawn-portal": "📍",
      "portal-scene_exit": "🚪",
      "building-hospital": "🏥",
      "building-police_station": "🚔",
      "building-library": "📚",
      "building-school": "🏫",
      "building-grocery_store": "🛒",
      "building-tavern": "🍺",
      "building-art_museum": "🎨",
    };

    this.levelData.layers.objects.forEach((obj) => {
      const icon =
        objectIcons[`${obj.type}-${obj.subtype}` as keyof typeof objectIcons] ||
        "❓";
      const x = obj.x * tileSize + tileSize / 2;
      const y = obj.y * tileSize + tileSize / 2;

      this.ctx.font = `${Math.max(16, tileSize * 0.5)}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";

      // Shadow
      this.ctx.fillStyle = "rgba(0,0,0,0.8)";
      this.ctx.fillText(icon, x + 1, y + 1);

      // Icon
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillText(icon, x, y);

      // Show portal/spawn IDs for debugging
      if (obj.type === "portal" || obj.type === "spawn") {
        const id = obj.properties?.portalId || obj.properties?.spawnId || "?";
        this.ctx.font = `${Math.max(8, tileSize * 0.2)}px Arial`;
        this.ctx.fillStyle = "rgba(255,255,255,0.8)";
        this.ctx.fillText(id, x, y + tileSize * 0.3);
      }
    });
  }

  private renderLayer(layerName: string, tileSize: number) {
    const layer = this.levelData.layers[layerName];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    const tileset = this.tilesets.get(layer.tilesetPath);
    if (!tileset || tileset === null || !tileset.complete) {
      // Only log once per tileset, not on every render
      if (tileset === undefined) {
        console.log(
          `Tileset not loaded for layer ${layerName}: ${layer.tilesetPath}`
        );
      }
      return;
    }

    const tilesX = Math.floor(tileset.width / this.levelData.tileSize);

    for (let y = 0; y < layer.data.length; y++) {
      for (let x = 0; x < layer.data[y].length; x++) {
        const tileId = layer.data[y][x];
        if (tileId === -1) continue;

        const srcX = (tileId % tilesX) * this.levelData.tileSize;
        const srcY = Math.floor(tileId / tilesX) * this.levelData.tileSize;

        this.ctx.drawImage(
          tileset,
          srcX,
          srcY,
          this.levelData.tileSize,
          this.levelData.tileSize,
          x * tileSize,
          y * tileSize,
          tileSize,
          tileSize
        );
      }
    }
  }

  private renderGrid(tileSize: number) {
    this.ctx.strokeStyle = "#bdc3c7";
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.levelData.width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * tileSize, 0);
      this.ctx.lineTo(x * tileSize, this.levelData.height * tileSize);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.levelData.height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * tileSize);
      this.ctx.lineTo(this.levelData.width * tileSize, y * tileSize);
      this.ctx.stroke();
    }
  }

  private updateCanvasTooltip(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const tileSize = this.levelData.tileSize * this.zoom;
    const levelWidth = this.levelData.width * tileSize;
    const levelHeight = this.levelData.height * tileSize;
    const offsetX = (this.canvas.width - levelWidth) / 2 + this.panX;
    const offsetY = (this.canvas.height - levelHeight) / 2 + this.panY;

    const x = Math.floor((event.clientX - rect.left - offsetX) / tileSize);
    const y = Math.floor((event.clientY - rect.top - offsetY) / tileSize);

    if (
      x >= 0 &&
      x < this.levelData.width &&
      y >= 0 &&
      y < this.levelData.height
    ) {
      const layer = this.levelData.layers[this.currentLayer];
      if (
        layer &&
        typeof layer === "object" &&
        "data" in layer &&
        layer.data &&
        layer.data[y]
      ) {
        const tileId = layer.data[y][x];
        this.showTileInfo(`Tile ID: ${tileId} (${x}, ${y})`);
      }
    } else {
      this.hideTileInfo();
    }
  }

  private showTileInfo(text: string) {
    const tileInfo = document.getElementById("tileInfo")!;
    tileInfo.textContent = text;
    tileInfo.style.display = "block";
  }

  private hideTileInfo() {
    const tileInfo = document.getElementById("tileInfo")!;
    tileInfo.style.display = "none";
  }

  private renderSelection(tileSize: number) {
    const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);

    this.ctx.strokeStyle = "#3498db";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.ctx.strokeRect(
      minX * tileSize,
      minY * tileSize,
      (maxX - minX + 1) * tileSize,
      (maxY - minY + 1) * tileSize
    );

    this.ctx.setLineDash([]);
  }

  private updateSelectionButtons() {
    const hasSelection = this.hasSelection;
    (document.getElementById("copyBtn") as HTMLButtonElement).disabled =
      !hasSelection;
    (document.getElementById("deleteBtn") as HTMLButtonElement).disabled =
      !hasSelection;
    (
      document.getElementById("replaceSelectionBtn") as HTMLButtonElement
    ).disabled = !hasSelection;
    (document.getElementById("pasteBtn") as HTMLButtonElement).disabled =
      this.clipboard.length === 0;
  }

  private replaceAllTiles() {
    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    // First click: select the tile to replace
    alert("Click on a tile in the level to select what to replace");
    this.setTool("replaceFrom");
  }

  private replaceAllFromTile(x: number, y: number) {
    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    if (y < 0 || y >= layer.data.length || x < 0 || x >= layer.data[y].length)
      return;

    const fromTile = layer.data[y][x];
    const toTile = this.selectedTile;

    if (fromTile === toTile) {
      alert("Source and target tiles are the same!");
      this.setTool("paint");
      return;
    }

    let count = 0;
    for (let row = 0; row < layer.data.length; row++) {
      for (let col = 0; col < layer.data[row].length; col++) {
        if (layer.data[row][col] === fromTile) {
          layer.data[row][col] = toTile;
          count++;
        }
      }
    }

    alert(`Replaced ${count} tiles (ID ${fromTile} → ${toTile})`);
    this.setTool("paint");
    this.render();
  }

  private copySelection() {
    if (!this.hasSelection) return;

    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);

    this.clipboard = [];
    for (let y = minY; y <= maxY; y++) {
      const row = [];
      for (let x = minX; x <= maxX; x++) {
        if (
          y >= 0 &&
          y < layer.data.length &&
          x >= 0 &&
          x < layer.data[y].length
        ) {
          row.push(layer.data[y][x]);
        } else {
          row.push(-1);
        }
      }
      this.clipboard.push(row);
    }

    this.updateSelectionButtons();
  }

  private pasteSelection() {
    if (this.clipboard.length === 0) return;

    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    const startX = this.hasSelection
      ? Math.min(this.selectionStart.x, this.selectionEnd.x)
      : 0;
    const startY = this.hasSelection
      ? Math.min(this.selectionStart.y, this.selectionEnd.y)
      : 0;

    for (let y = 0; y < this.clipboard.length; y++) {
      for (let x = 0; x < this.clipboard[y].length; x++) {
        const targetY = startY + y;
        const targetX = startX + x;

        if (
          targetY >= 0 &&
          targetY < layer.data.length &&
          targetX >= 0 &&
          targetX < layer.data[targetY].length
        ) {
          layer.data[targetY][targetX] = this.clipboard[y][x];
        }
      }
    }

    this.render();
  }

  private deleteSelection() {
    if (!this.hasSelection) return;

    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (
          y >= 0 &&
          y < layer.data.length &&
          x >= 0 &&
          x < layer.data[y].length
        ) {
          layer.data[y][x] = -1;
        }
      }
    }

    this.render();
  }

  private replaceSelection() {
    if (!this.hasSelection) return;

    const layer = this.levelData.layers[this.currentLayer];
    if (!layer || typeof layer !== "object" || !("data" in layer)) return;

    const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (
          y >= 0 &&
          y < layer.data.length &&
          x >= 0 &&
          x < layer.data[y].length
        ) {
          layer.data[y][x] = this.selectedTile;
        }
      }
    }

    this.render();
  }
}

// Initialize the level editor
new LevelEditor();
