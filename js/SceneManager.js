"use strict";


/**
 * Manipulating the scene (models, lights, camera).
 * @type {Object}
 */
var SceneManager = {

	fillings: [],
	holes: [],
	holeLines: [],
	lightStatus: {
		ambient: true,
		camera: true,
		directional: true
	},
	modeFilling: CONFIG.MODE,
	modeModel: CONFIG.MODE,
	model: null,
	scene: null,
	shading: CONFIG.SHADING,


	/**
	 * Show coordinate system axis.
	 * Adds an axis to the scene. Does not call render() function!
	 */
	addAxis: function() {
		var axis = new THREE.AxisHelper( CONFIG.AXIS.SIZE );

		axis.name = "axis";
		this.scene.add( axis );
	},


	/**
	 * Center a mesh.
	 * @param  {THREE.Mesh} mesh The mesh to center.
	 * @return {THREE.Mesh}      Centered mesh.
	 */
	centerModel: function( mesh ) {
		var center = mesh.geometry.boundingBox.center();

		mesh.position.x -= center.x;
		mesh.position.y -= center.y;
		mesh.position.z -= center.z;

		return mesh;
	},


	/**
	 * Change the mode the model is rendered: Solid or Wireframe.
	 * @param {String} what "model" or "filling".
	 */
	changeMode: function( e, what ) {
		var value = e.target.value;

		if( !e.target.checked || this.model === null ) {
			return false;
		}

		if( what == "model" ) {
			switch( value ) {

				case "solid":
					this.model.material.wireframe = false;
					break;

				case "wireframe":
					this.model.material.wireframe = true;
					break;

				default:
					return false;

			}

			this.modeModel = value;
		}
		else if( what == "filling" ) {
			switch( value ) {

				case "solid":
					for( var i = 0; i < this.fillings.length; i++ ) {
						this.fillings[i].solid.material.wireframe = false;
					}
					break;

				case "wireframe":
					for( var i = 0; i < this.fillings.length; i++ ) {
						this.fillings[i].solid.material.wireframe = true;
					}
					break;

				default:
					return false;

			}

			this.modeFilling = value;
		}

		render();
	},


	/**
	 * Change the shading of the material: None, Flat or Phong.
	 */
	changeShading: function( e ) {
		var g = GLOBAL,
		    value = e.target.value;
		var shading;

		if( !e.target.checked || this.model === null ) {
			return false;
		}

		switch( value ) {

			case "none":
				shading = THREE.NoShading;
				break;

			case "flat":
				shading = THREE.FlatShading;
				break;

			case "phong":
				shading = THREE.SmoothShading;
				break;

			default:
				return false;

		}

		this.model.material.shading = shading;
		this.model.geometry.normalsNeedUpdate = true;

		for( var i = 0; i < this.fillings.length; i++ ) {
			this.fillings[i].solid.material.shading = shading;
			this.fillings[i].solid.geometry.normalsNeedUpdate = true;
		}

		this.shading = value;
		render();
	},


	/**
	 * Clear the scene (except for the lights, camera and axis).
	 */
	clearModels: function() {
		var obj;

		for( var i = this.scene.children.length - 1; i >= 0; i-- ) {
			obj = this.scene.children[i];

			if( obj instanceof THREE.Light || obj instanceof THREE.Camera ) {
				continue;
			}
			if( obj.name == "axis" ) {
				continue;
			}

			this.scene.remove( obj );
		}

		this.fillings = [];
	},


	/**
	 * Create an optical representation of a cross vector.
	 * Creates a point and a line.
	 * @param  {THREE.Vector3} vp            Previous vector.
	 * @param  {THREE.Vector3} v             Center vector of the angle.
	 * @param  {THREE.Vector3} vn            Next vector.
	 * @param  {float}         size          Size of the point.
	 * @param  {hexadecimal}   color         Color for the objects.
	 * @param  {boolean}       moveWithModel Adjust position with the currently loaded model.
	 * @return {Object}                      Point and line for the cross vector.
	 */
	createCrossVector: function( vp, v, vn, size, color, moveWithModel ) {
		var cross = new THREE.Vector3();
		var line, point;

		cross = cross.crossVectors( vp.clone().sub( v ), vn.clone().sub( v ) ).add( v );
		point = this.createPoint( cross, size, color, moveWithModel );
		line = this.createLine( v, cross, 1, color, moveWithModel );

		return {
			point: point,
			line: line
		};
	},


	/**
	 * Create a line from a starting to an end point.
	 * @param  {THREE.Vector3} from          Start point.
	 * @param  {THREE.Vector3} to            End point.
	 * @param  {float}         width         Line width of the line.
	 * @param  {hexadecimal}   color         Color of the line.
	 * @param  {boolean}       moveWithModel If true, move the line to the position of the model.
	 * @return {THREE.Line}                  A THREE.Line object.
	 */
	createLine: function( from, to, width, color, moveWithModel ) {
		var geo = new THREE.Geometry(),
		    material = new THREE.LineBasicMaterial( { linewidth: width, color: color } );

		geo.vertices.push( from.clone().add( this.model.position ) );
		geo.vertices.push( to.clone().add( this.model.position ) );

		return new THREE.Line( geo, material );
	},


	/**
	 * Create a sphere mesh.
	 * @param  {Dictionary}  position      Position of the sphere.
	 * @param  {float}       size          Radius of the sphere.
	 * @param  {hexadecimal} color         Color of the sphere.
	 * @param  {boolean}     moveWithModel If true, move the point to the position of the model.
	 * @return {THREE.Mesh}
	 */
	createPoint: function( position, size, color, moveWithModel ) {
		var material = new THREE.MeshBasicMaterial( { color: color } );
		var mesh = new THREE.Mesh( new THREE.SphereGeometry( size ), material );

		mesh.position.x = position.x;
		mesh.position.y = position.y;
		mesh.position.z = position.z;

		if( moveWithModel ) {
			var gmp = this.model.position;

			mesh.position.x += gmp.x;
			mesh.position.y += gmp.y;
			mesh.position.z += gmp.z;
		}

		return mesh;
	},


	/**
	 * Export the model.
	 * @param  {String} format    Name of the format to use.
	 * @param  {String} modelName Name for the model. (optional)
	 * @return {String}           Exported model data.
	 */
	exportModel: function( format, modelName ) {
		var exportData;

		Stopwatch.start( "export" );

		switch( format ) {

			case "obj":
				exportData = exportOBJ( this.model );
				break;

			case "stl":
				exportData = exportSTL( this.model, modelName );
				break;

			default:
				throw new Error( "Unknown export format: " + format );

		}

		Stopwatch.stop( "export", true );

		return exportData;
	},


	/**
	 * Start the hole filling.
	 */
	fillHole: function( e ) {
		var g = GLOBAL,
		    index = parseInt( e.target.getAttribute( "data-fillhole" ), 10 ),
		    mergeThreshold = parseFloat( document.getElementById( "merge-threshold" ).value, 10 ),
		    workerNumber = parseInt( document.getElementById( "collision-worker" ).value, 10 );

		if( isNaN( index ) ) {
			console.error( "Not a valid hole index." );
			return;
		}
		if( this.holes.length <= index ) {
			console.error( "No hole exists for this index." );
			return;
		}
		if( isNaN( mergeThreshold ) || mergeThreshold < 0.001 ) {
			console.error( "Merge threshold not a valid value. Needs to be greater or equal 0.001." );
			return;
		}
		if( isNaN( workerNumber ) || workerNumber < 1 ) {
			console.error( "Number of worker processes not a valid value. Need to be greater or equal 1. Optimal number equals the number of CPU cores." );
			return;
		}

		Stopwatch.start( "fill hole (AF)" );
		UI.disableFillButton();
		AdvancingFront.start( this.model.geometry, this.holes[index], mergeThreshold, this.mergeWithFilling.bind( this ), workerNumber );
	},


	/**
	 * Show the border edges of the model.
	 */
	findHoles: function() {
		if( this.model == null ) {
			console.error( "No model loaded." );
			return;
		}

		// Remove old hole outlines
		if( this.holeLines.length > 0 ) {
			for( var i = 0, len = this.holeLines.length; i < len; i++ ) {
				this.scene.remove( this.holeLines[i] );
			}
		}
		this.holeLines = [];

		Stopwatch.start( "find holes" );

		var border = HoleFinding.findBorderEdges( this.model );

		Stopwatch.stop( "find holes", true );
		Stopwatch.remove( "find holes" );

		if( CONFIG.HOLES.SHOW_LINES ) {
			for( var i = 0, len = border.lines.length; i < len; i++ ) {
				this.scene.add( border.lines[i] );
			}
			this.holeLines = border.lines;
		}

		// @see HoleFinding.findBorderEdges() for
		// use of CONFIG.HOLES.SHOW_POINTS
		for( var i = 0, len = border.points.length; i < len; i++ ) {
			this.scene.add( border.points[i] );
		}
		render();

		this.holes = border.holes;
		UI.showDetailHoles( border.lines );
	},


	/**
	 * Fit the camera position to the model size.
	 */
	fitCameraToModel: function() {
		var bb = this.model.geometry.boundingBox;

		this.resetCamera();

		GLOBAL.CAMERA.position.x = Math.abs( bb.max.x - bb.min.x );
		GLOBAL.CAMERA.position.y = Math.abs( bb.max.y - bb.min.y );
		GLOBAL.CAMERA.position.z = Math.abs( bb.max.z - bb.min.z );
	},


	/**
	 * Focus on the found hole.
	 * @param {int} index Index of the found hole
	 */
	focusHole: function( index ) {
		var cfgCam = CONFIG.CAMERA,
		    g = GLOBAL;

		if( isNaN( index ) ) {
			console.error( "Not a valid hole index." );
			return;
		}
		if( this.holes.length <= index ) {
			console.error( "No hole exists for this index." );
			return;
		}

		var bbox = Utils.getBoundingBox( this.holes[index] );

		bbox.center.add( this.model.position );
		bbox.center.setLength( bbox.center.length() * cfgCam.FOCUS.DISTANCE_FACTOR );

		var stepX = ( bbox.center.x - GLOBAL.CAMERA.position.x ),
		    stepY = ( bbox.center.y - GLOBAL.CAMERA.position.y ),
		    stepZ = ( bbox.center.z - GLOBAL.CAMERA.position.z );

		if( cfgCam.FOCUS.STEPS > 0 ) {
			stepX /= cfgCam.FOCUS.STEPS;
		    stepY /= cfgCam.FOCUS.STEPS;
		    stepZ /= cfgCam.FOCUS.STEPS;
		}

		this.moveCameraToPosition( stepX, stepY, stepZ, 0 );
	},


	/**
	 * Prepare the model as mesh.
	 * @param  {THREE.Geometry} geometry Geometry of the model.
	 * @return {THREE.Mesh}              Model as mesh.
	 */
	geometryToMesh: function( geometry ) {
		var material = new THREE.MeshPhongMaterial(),
		    mesh = new THREE.Mesh( geometry );

		material.shading = this.getCurrentShading();
		material.side = THREE.DoubleSide;
		material.wireframe = ( this.modeModel == "wireframe" );

		mesh.material = material;

		mesh.geometry.computeFaceNormals();
		mesh.geometry.computeVertexNormals();
		mesh.geometry.computeBoundingBox();

		return mesh;
	},


	/**
	 * Get the current shading type.
	 * @return {int} THREE.NoShading, THREE.FlatShading or THREE.SmoothShading.
	 */
	getCurrentShading: function() {
		switch( this.shading ) {

			case "none":
				return THREE.NoShading;

			case "flat":
				return THREE.FlatShading;

			case "phong":
				return THREE.SmoothShading;

			default:
				return false;

		}
	},


	/**
	 * Initialize the scene.
	 */
	init: function() {
		this.scene = new THREE.Scene();

		// Axis
		if( CONFIG.AXIS.SHOW ) {
			this.addAxis();
		}
	},


	/**
	 * Merge the model with the new filling.
	 * @param {THREE.Geometry} filling The filling to merge into the model.
	 */
	mergeWithFilling: function( filling, holeIndex ) {
		var gm = this.model;

		THREE.GeometryUtils.merge( gm.geometry, filling );

		gm.geometry.mergeVertices();
		gm.geometry.computeFaceNormals();
		gm.geometry.computeVertexNormals();
		gm.geometry.computeBoundingBox();

		UI.checkHoleFinished( holeIndex );
		UI.updateProgress( 100 );

		Stopwatch.stop( "fill hole (AF)", true );
	},


	/**
	 * Move the camera lights to the camera position.
	 * @param {Event} e Change event fired by THREE.TrackballControls
	 */
	moveCameraLights: function( e ) {
		var lights = GLOBAL.LIGHTS.CAMERA,
		    pos = e.target.object.position.clone();

		for( var i = 0, len = lights.length; i < len; i++ ) {
			lights[i].position = pos;
		}
	},


	/**
	 * Move the camera (more-or-less) fluently to a position.
	 * @param {float} stepX Step length in X direction.
	 * @param {float} stepY Step length in Y direction.
	 * @param {float} stepZ Step length in Z direction.
	 * @param {int}   count Counter to know when to stop.
	 */
	moveCameraToPosition: function( stepX, stepY, stepZ, count ) {
		GLOBAL.CAMERA.position.x += stepX;
		GLOBAL.CAMERA.position.y += stepY;
		GLOBAL.CAMERA.position.z += stepZ;
		render();

		count++;

		if( count >= CONFIG.CAMERA.FOCUS.STEPS ) {
			return;
		}
		else {
			setTimeout(
				function() {
					SceneManager.moveCameraToPosition( stepX, stepY, stepZ, count );
				},
				CONFIG.CAMERA.FOCUS.TIMEOUTS
			);
		}
	},


	/**
	 * Show the bounding box of the model.
	 * @param {THREE.Mesh} model The model.
	 */
	renderBoundingBox: function( model ) {
		var bb = model.geometry.boundingBox,
		    cubeGeometry = new THREE.Geometry();
		var material, mesh;

		material = new THREE.LineBasicMaterial( {
			color: CONFIG.BBOX.COLOR,
			shading: THREE.NoShading
		} );

		cubeGeometry.vertices.push(
			// bottom plane
			bb.min,
			new THREE.Vector3( bb.max.x, bb.min.y, bb.min.z ),

			new THREE.Vector3( bb.max.x, bb.min.y, bb.min.z ),
			new THREE.Vector3( bb.max.x, bb.max.y, bb.min.z ),

			new THREE.Vector3( bb.max.x, bb.max.y, bb.min.z ),
			new THREE.Vector3( bb.min.x, bb.max.y, bb.min.z ),

			new THREE.Vector3( bb.min.x, bb.max.y, bb.min.z ),
			bb.min,

			// top plane
			bb.max,
			new THREE.Vector3( bb.min.x, bb.max.y, bb.max.z ),

			new THREE.Vector3( bb.min.x, bb.min.y, bb.max.z ),
			new THREE.Vector3( bb.min.x, bb.max.y, bb.max.z ),

			new THREE.Vector3( bb.min.x, bb.min.y, bb.max.z ),
			new THREE.Vector3( bb.max.x, bb.min.y, bb.max.z ),

			new THREE.Vector3( bb.max.x, bb.min.y, bb.max.z ),
			bb.max,

			// "pillars" connecting bottom and top
			bb.min,
			new THREE.Vector3( bb.min.x, bb.min.y, bb.max.z ),

			new THREE.Vector3( bb.max.x, bb.min.y, bb.min.z ),
			new THREE.Vector3( bb.max.x, bb.min.y, bb.max.z ),

			new THREE.Vector3( bb.max.x, bb.max.y, bb.min.z ),
			new THREE.Vector3( bb.max.x, bb.max.y, bb.max.z ),

			new THREE.Vector3( bb.min.x, bb.max.y, bb.min.z ),
			new THREE.Vector3( bb.min.x, bb.max.y, bb.max.z )
		);

		mesh = new THREE.Line( cubeGeometry, material, THREE.LinePieces );
		mesh.position = model.position;

		this.scene.add( mesh );
	},


	/**
	 * Reset the camera settings.
	 */
	resetCamera: function() {
		GLOBAL.CONTROLS.reset();
	},


	/**
	 * Render the finished hole filling.
	 * Create a mesh from the computed data and render it.
	 * @param {THREE.Geometry} front   Front of the hole.
	 * @param {THREE.Geometry} filling Filling of the hole.
	 */
	showFilling: function( front, filling, holeIndex ) {
		var g = GLOBAL,
		    model = SceneManager.model;

		this.fillings.push( { solid: false, wireframe: false } );

		// Filling
		var materialFilling = new THREE.MeshPhongMaterial( {
			color: CONFIG.FILLING.COLOR,
			shading: SceneManager.getCurrentShading(),
			side: THREE.DoubleSide,
			wireframe: ( this.modeFilling == "wireframe" ),
			wireframeLinewidth: CONFIG.FILLING.LINE_WIDTH
		} );
		var meshFilling = new THREE.Mesh( filling, materialFilling );

		meshFilling.position.x += model.position.x;
		meshFilling.position.y += model.position.y;
		meshFilling.position.z += model.position.z;

		meshFilling.geometry.computeFaceNormals();
		meshFilling.geometry.computeVertexNormals();
		meshFilling.geometry.computeBoundingBox();

		this.fillings[this.fillings.length - 1].solid = meshFilling;
		SceneManager.scene.add( meshFilling );


		// Extra option: Filling as wireframe (can be used as overlay)
		if( CONFIG.FILLING.SHOW_WIREFRAME ) {
			var materialWire = new THREE.MeshBasicMaterial( {
				color: 0xFFFFFF,
				side: THREE.DoubleSide,
				wireframe: true,
				wireframeLinewidth: CONFIG.FILLING.LINE_WIDTH
			} );
			var meshWire = new THREE.Mesh( filling, materialWire );

			meshWire.position.x += model.position.x;
			meshWire.position.y += model.position.y;
			meshWire.position.z += model.position.z;

			meshWire.geometry.computeFaceNormals();
			meshWire.geometry.computeVertexNormals();
			meshWire.geometry.computeBoundingBox();

			this.fillings[this.fillings.length - 1].wireframe = meshWire;
			SceneManager.scene.add( meshWire );
		}


		// Draw the (moving) front
		if( CONFIG.DEBUG.SHOW_FRONT ) {
			var debugFront = front.clone();
			var material = new THREE.LineBasicMaterial( {
				color: 0xFFFFFF,
				linewidth: 4
			} );
			var mesh;

			debugFront.vertices.push( debugFront.vertices[0] );
			mesh = new THREE.Line( debugFront, material );

			mesh.position.x += model.position.x;
			mesh.position.y += model.position.y;
			mesh.position.z += model.position.z;

			SceneManager.scene.add( mesh );
		}

		render();
	},


	/**
	 * Switch the light on or off.
	 */
	toggleLight: function( e ) {
		var g = GLOBAL,
		    lightType = e.target.name;
		var lights, lightStatus;

		switch( lightType ) {

			case "light_ambient":
				lights = g.LIGHTS.AMBIENT;
				lightStatus = this.lightStatus.ambient;
				this.lightStatus.ambient = !lightStatus;
				break;

			case "light_camera":
				lights = g.LIGHTS.CAMERA;
				lightStatus = this.lightStatus.camera;
				this.lightStatus.camera = !lightStatus;
				break;

			case "light_directional":
				lights = g.LIGHTS.DIRECTIONAL;
				lightStatus = this.lightStatus.directional;
				this.lightStatus.directional = !lightStatus;
				break;

			default:
				console.error( "Unknown light type: " + lightType );
				return;

		}

		var len = lights.length;

		if( lightStatus ) {
			for( var i = 0; i < len; i++ ) {
				this.scene.remove( lights[i] );
			}
		}
		else {
			for( var i = 0; i < len; i++ ) {
				this.scene.add( lights[i] );
			}
		}

		render();
	}

};
