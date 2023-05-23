import { loadModules } from "esri-loader";

export async function scene(node) {
  const esriLoaderOptions = {
    version: "4.26",
    css: true,
  };

  let view;

  const widgets = [{ name: "Zoom" }];
  const expands = [
    {
      name: "Search",
      icon: "esri-icon-search",
      options: { includeDefaultSources: true },
    },
    { name: "BasemapGallery", icon: "esri-icon-basemap" },
    { name: "LayerList", icon: "esri-icon-layer-list" },
    { name: "Legend", icon: "esri-icon-feature-layer" },
    { name: "Editor", icon: "esri-icon-edit" },
    {
      name: "DirectLineMeasurement3D",
      icon: "esri-icon-measure",
      watchExpandFor: {
        expanded: (nV, oV, expProp, expObj) => {
          expObj.content.viewModel.clear();
        },
      },
      watchWidgetFor: {
        "viewModel.state": (nV, oV, expProp, expObj) => {
          if (nV === "measuring") {
            expObj.view.emit("clickable", false);
          } else if (nV !== "measuring" && oV === "measuring") {
            expObj.view.emit("clickable", true);
          }
          console.log("viewmodel state change", nV, expObj);
        },
      },
    },
  ];

  const widgetList = widgets
    ? widgets.map((w) => (w.class ? w.class : `esri/widgets/${w.name}`))
    : [];
  const expandList = expands
    ? expands.map((w) => (w.class ? w.class : `esri/widgets/${w.name}`))
    : [];

  await loadModules(
    [
      "esri/WebScene",
      "esri/views/SceneView",
      "esri/widgets/Expand",
    ]
      .concat(widgetList)
      .concat(expandList),
    esriLoaderOptions
  ).then(([WebScene, SceneView, Expand, ...widgetArray]) => {
    const params = new URLSearchParams(window.location.search.toLowerCase());
    const webSceneId= params.get("websceneid");
    if (webSceneId) {
      const map = new WebScene({
        portalItem: {
          id: webSceneId,
        },
      });

      view = new SceneView({
        container: node,
        map: map,
        ui: {
          components: ["attribution"],
        },
      });

      const destructureLayers = function (obj) {
        return obj.layers.items.map((l) => {
          return l.layers ? destructureLayers(l) : l;
        });
      };

      const ungroupLayers = function (obj) {
        return destructureLayers(obj).flat();
      };

      view.when(async () => {
        let allLayers = [];
        let hasEditableLayers = false;
        const layers = ungroupLayers(view.map);
        for (let i = 0; i < layers.length; i++) {
          const layer = layers[i];
          await view.whenLayerView(layer);
          if (layer.editingEnabled) hasEditableLayers = true;
          if (layer.fields) {
            const fieldNames = layer.fields.map((f) => f.name);
            allLayers.push({ layer, searchFields: fieldNames });
          }
        }

        const allWidgets = [];

        widgetList.forEach((w, i) => {
          const loadedWidget = widgetArray[i];
          const widget = new loadedWidget({
            view: view,
            container: document.createElement("div"),
            ...widgets[i].options,
          });
          allWidgets.push(widget);
        });

        expandList.forEach((w, i) => {
          if (w === "esri/widgets/Editor" && !hasEditableLayers) return;
          if (w === "esri/widgets/Search") {
            expands[i].options = expands[i].options || {};
            expands[i].options.sources =
              expands[i].options.sources || allLayers;
          }
          const loadedWidget = widgetArray[i + widgetList.length];
          const widget = new loadedWidget({
            view: view,
            container: document.createElement("div"),
            ...expands[i].options,
          });
          console.log("loaded widget", {
            view: view,
            container: document.createElement("div"),
            ...expands[i].options,
          });
          const expand = new Expand({
            view: view,
            group: "expands",
            autoCollapse: true,
            content: widget,
            expandIconClass: expands[i].icon,
          });
          if (expands[i].watchWidgetFor) {
            Object.keys(expands[i].watchWidgetFor).forEach((prop) => {
              // for some reason widget is null here even if assign to temp var so using this doesn't work
              widget.watch(prop, (...args) =>
                expands[i].watchWidgetFor[prop].apply(widget, args)
              );
            });
          }
          if (expands[i].watchExpandFor) {
            Object.keys(expands[i].watchExpandFor).forEach((prop) => {
              // for some reason widget is null here even if assign to temp var so using this doesn't work
              expand.watch(prop, (...args) =>
                expands[i].watchExpandFor[prop].apply(expand, args)
              );
            });
          }
          // expand.watch("expanded", setActiveExpand);
          allWidgets.push(expand);
        });

        view.ui.add(allWidgets, "top-right");
        console.log("All widgets added");

      });
    } else {
      console.error(
        `No webSceneIdfound in url search params - please add ${
          Array.from(params).length > 0 ? "&" : "?"
        }webSceneId=<id> to the url`
      );
    }
  });

  return view;
}
