<script>
	import { onMount } from "svelte"
	import { viewer as geocamViewer } from "geocam-viewer"
	import { orbitControls } from "orbit-controls"
	import { multiviewWindow } from "multiview-window"
	import { compassNeedle } from "compass-needle"
	import { loadingIndicator } from "loading-indicator"
	import { urlFragments } from "url-fragments"
	import { label } from "label"
	import { prevNextControls } from "prev-next-control"
	import { arcgisScene } from "arcgis-scene"

	import { scene } from './lib/scene.js'

	// Elements
  	let sceneNode;
  	let viewerNode;

	// Setup the geocam viewer
	async function Setup() {
		const scenePromise = scene(sceneNode);

		const prevNextPlugin = new prevNextControls();
		const multiviewWindowPlugin = new multiviewWindow({ mapElement:sceneNode });
		const viewer = new geocamViewer(viewerNode, {
			plugins: [
				new orbitControls(),
				new compassNeedle(),
				new label(),
				new urlFragments({stores: ['fov','facing','horizon','shot','capture','visible','left','top','width','height','mode','autorotate','autobrightness','zoom','center','camLat','camLng','camAlt','camHdg','camTilt','camFov']}),
				new loadingIndicator(),
				multiviewWindowPlugin,
				prevNextPlugin
			],
		});

		// Setup the viewer hemispheres for each image
		await viewer.setup({
			hemispheres: [
			"https://f004.backblazeb2.com/file/gc-projects-public/millgeo_31894/knox/solution/3/calibration/0/hemisphere_0.obj",
			"https://f004.backblazeb2.com/file/gc-projects-public/millgeo_31894/knox/solution/3/calibration/1/hemisphere_1.obj",
			"https://f004.backblazeb2.com/file/gc-projects-public/millgeo_31894/knox/solution/3/calibration/2/hemisphere_2.obj",
		],
		})

		scenePromise.then((sceneView) => {
			sceneView.when(() => {
			viewer.plugin(
				new arcgisScene({
					sceneView,
					prevNextPlugin,
				})
			);
			});
		});
	}

	// After the page has loaded run the following
	onMount(async () => {
		await Setup();
	})
</script>

<main>
	<div class="wrapper">
		<div class="scene" bind:this={sceneNode}/>
	  </div>
	<div class="scene" bind:this={viewerNode}/>  
</main>

<style>
	.wrapper {
	  height: 100%;
	  display: flex;
	  justify-content: space-between;
	}
  
	.scene {
	  width: 100%;
	  height: 100%;
	}
  </style>