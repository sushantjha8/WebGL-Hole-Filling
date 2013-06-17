"use strict";


/**
 * Class for hole finding and filling algorithms.
 * @type {Object}
 */
var HoleFilling = {

	/**
	 * Fill the hole using the advancing front algorithm.
	 * @param {THREE.Mesh}        model The model to fill the holes in.
	 * @param {Array<THREE.Line>} holes List of the holes.
	 */
	advancingFront: function( model, holes ) {
		var filling = new THREE.Geometry();

		// Step 1: Get the front using the boundary vertices of the hole.
		var front = holes[0].geometry.vertices;
		var len = front.length;


		// Step 2: Calculate the angel between two adjacent vertices.
		var angles = [],
		    smallest = {
				angle: 361.0,
				index: -1
		    };
		var angle, v, vn, vp;

		for( var i = 0; i < len; i++ ) {
			vp = front[( i == 0 ) ? len - 2 : i - 1];
			v = front[i];
			vn = front[( i + 1 ) % len];

			angle = this.computeAngle( vp, v, vn );
			angles.push( angle );

			if( smallest.angle > angle ) {
				smallest.angle = angle;
				smallest.index = i;
			}
		}

		render();


		// Step 3: Create new triangles on the plane.
		var j = smallest.index,
		    update = new THREE.Geometry(),
		    material = new THREE.LineBasicMaterial( { color: 0xFFFFFF } );

		while( true ) {
			if( j >= smallest.index + len ) {
				break;
			}
			angle = angles[j % len];
			vp = front[( j == 0 ) ? len - 2 : ( j - 1 ) % len];
			v = front[j % len];
			vn = front[( j + 1 ) % len];

			if( !v || !vn ) {
				j++;
				continue;
			}

			// Rule 1: Just close the gap.
			if( angle <= 75.0 ) {
				this.afRule1( update, angle, vp, v, vn );
			}
			// Rule 2: Create one new vertice.
			else if( angle > 75.0 && angle <= 135.0 ) {
				this.afRule2( update, angle, vp, v, vn );
			}
			// Rule 3: Create two new vertices.
			else { // angle > 135.0
				this.afRule3( update, angle, vp, v, vn );
			}

			j++;
		}

		update.vertices.push( update.vertices[0] );

		var mesh = new THREE.Line( update, material );
		mesh.position.x += model.position.x;
		mesh.position.y += model.position.y;
		mesh.position.z += model.position.z;
		GLOBAL.SCENE.add( mesh );

		render();


		// Step 4: Compute the distances between each new created vertices and see, if they are merged.
		// Step 5: Update the front.
		// Step 6: Repeat step 2–5.
	},


	/**
	 * Apply rule 1 of the advancing front mesh algorithm.
	 * Rule 1: Close gaps of angles <= 75°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {float}          angle  Angle between vp and vn relative to v.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule1: function( update, angle, vp, v, vn ) {
		//update.vertices.push( vp );
		//update.vertices.push( vn );

		var pos = {
			x: vp.x + GLOBAL.MODEL.position.x,
			y: vp.y + GLOBAL.MODEL.position.y,
			z: vp.z + GLOBAL.MODEL.position.z
		};
		GLOBAL.SCENE.add( Scene.createPoint( pos, 0.03, CONFIG.HF.FILLING.COLOR ) );

		var pos = {
			x: vn.x + GLOBAL.MODEL.position.x,
			y: vn.y + GLOBAL.MODEL.position.y,
			z: vn.z + GLOBAL.MODEL.position.z
		};
		GLOBAL.SCENE.add( Scene.createPoint( pos, 0.03, CONFIG.HF.FILLING.COLOR ) );
	},


	/**
	 * Apply rule 2 of the advancing front mesh algorithm.
	 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {float}          angle  Angle between vp and vn relative to v.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule2: function( update, angle, vp, v, vn ) {
		var vpTemp = new THREE.Vector3().copy( vp ),
		    vnTemp = new THREE.Vector3().copy( vn ),
		    vNew = new THREE.Vector3();

		vNew.copy( vnTemp );

		vpTemp.add( v );
		vnTemp.add( v );

		vpTemp.normalize();
		vnTemp.normalize();

		var rotAxis = new THREE.Vector3().crossVectors( vnTemp, vpTemp );
		rotAxis.add( v );
		rotAxis.normalize();

		var angleRad = ( 180 ) * Math.PI / 180.0;

		// Rotation axis
		GLOBAL.SCENE.add( Scene.createPoint( rotAxis, 0.04, 0xFF4000 ) );
		GLOBAL.SCENE.add( Scene.createLine( v, new THREE.Vector3().copy( rotAxis ), 4, 0xFF4000 ) );

		// Point before rotation
		GLOBAL.SCENE.add( Scene.createPoint( vNew, 0.04, 0x0080F0 ) );
		GLOBAL.SCENE.add( Scene.createLine( new THREE.Vector3().copy( vNew ), rotAxis, 2, 0x0080F0 ) );

		vNew.applyAxisAngle( rotAxis, angleRad );

		// Point after rotation
		GLOBAL.SCENE.add( Scene.createPoint( vNew, 0.04, 0x40D010 ) );
		GLOBAL.SCENE.add( Scene.createLine( new THREE.Vector3().copy( vNew ), rotAxis, 2, 0x40E010 ) );


		var pos = {
			x: vNew.x + GLOBAL.MODEL.position.x,
			y: vNew.y + GLOBAL.MODEL.position.y,
			z: vNew.z + GLOBAL.MODEL.position.z
		}
		//GLOBAL.SCENE.add( Scene.createPoint( vNew, 0.04, 0xFFFF00 ) );

		/*update.vertices.push( vp );
		update.vertices.push( vNew );*/
		update.vertices.push( v );
		update.vertices.push( vNew );
		//update.vertices.push( vn );
	},


	/**
	 * Apply rule 3 of the advancing front mesh algorithm.
	 * Rule 3: Create two new vertices if the angle is > 135°.
	 * @param {THREE.Geometry} update New geometry of the current iteration.
	 * @param {float}          angle  Angle between vp and vn relative to v.
	 * @param {THREE.Vector3}  vp     Previous vector.
	 * @param {THREE.Vector3}  v      Current vector.
	 * @param {THREE.Vector3}  vn     Next vector.
	 */
	afRule3: function( update, angle, vp, v, vn ) {
		return; // FIXME
		var vpTemp = new THREE.Vector3().copy( vp ),
		    vnTemp = new THREE.Vector3().copy( vn ),
		    vNew1 = new THREE.Vector3(),
		    vNew2 = new THREE.Vector3();

		vpTemp.add( v );
		vnTemp.add( v );

		vNew1.addVectors( vpTemp, vnTemp );

		vNew2.addVectors( vpTemp, vnTemp );

		vNew1.sub( v );
		vNew2.sub( v );

		var pos = {
			x: vNew1.x + GLOBAL.MODEL.position.x,
			y: vNew1.y + GLOBAL.MODEL.position.y,
			z: vNew1.z + GLOBAL.MODEL.position.z
		}
		GLOBAL.SCENE.add( Scene.createPoint( pos, 0.03, 0x8080FF ) );

		var pos = {
			x: vNew2.x + GLOBAL.MODEL.position.x,
			y: vNew2.y + GLOBAL.MODEL.position.y,
			z: vNew2.z + GLOBAL.MODEL.position.z
		}
		GLOBAL.SCENE.add( Scene.createPoint( pos, 0.03, 0x8080FF ) );

		update.vertices.push( vp );
		update.vertices.push( vNew1 );
		update.vertices.push( v );
		update.vertices.push( vNew1 );
		update.vertices.push( vNew2 );
		update.vertices.push( v );
		update.vertices.push( vNew2 );
		update.vertices.push( vn );
	},


	/**
	 * Compute the angle between two vertices.
	 * @param  {THREE.Vector3} vp The previous vertex.
	 * @param  {THREE.Vector3} v  The current vertex.
	 * @param  {THREE.Vector3} vn The next vertex.
	 * @return {float}         Angle between the vertices in degree.
	 */
	computeAngle: function( vp, v, vn ) {
		var vpTemp = new THREE.Vector3().subVectors( vp, v ),
		    vnTemp = new THREE.Vector3().subVectors( vn, v ),
		    vTemp = new THREE.Vector3().copy( v ).add( GLOBAL.MODEL.position ),
		    t1 = new THREE.Vector3().copy( vp ).sub( v ),
		    t2 = new THREE.Vector3().copy( vn ).sub( v ),
		    c = new THREE.Vector3().crossVectors( t1, t2 ).add( v ).add( GLOBAL.MODEL.position ),
		    angle = vpTemp.angleTo( vnTemp ) * 180 / Math.PI;

		if( c.length() < vTemp.length() ) {
			angle = 360.0 - angle;
		}

		return angle;
	},


	/**
	 * Find the border edges of a hole inside a half-edge structure.
	 * @param  {THREE.Mesh} model  The model to find holes in.
	 * @return {Object}            Arrays of lines and points, depending on configuration.
	 */
	findBorderEdges: function( model ) {
		var colors = CONFIG.HF.BORDER.COLOR,
		    ignore = [],
		    lines = [],
		    points = [],
		    pos = new THREE.Vector3();
		var geometry, line, material, mesh, v, vertex;

		mesh = new HalfEdgeMesh( model.geometry );

		for( var i = 0; i < mesh.vertices.length; i++ ) {
			vertex = mesh.vertices[i];

			if( ignore.indexOf( vertex.index ) < 0 && vertex.isBorderPoint() ) {
				// Find connected border points
				geometry = this.getNeighbouringBorderPoints( model, ignore, vertex );

				// Lines
				material = new THREE.LineBasicMaterial( {
					color: colors[lines.length % colors.length],
					linewidth: CONFIG.HF.BORDER.LINE_WIDTH
				} );

				line = new THREE.Line( geometry, material );
				line.position = model.position;
				lines.push( line );

				// Points
				if( CONFIG.HF.BORDER.SHOW_POINTS ) {
					for( var j = 0; j < geometry.vertices.length; j++ ) {
						v = geometry.vertices[j];
						pos.set(
							v.x + model.position.x,
							v.y + model.position.y,
							v.z + model.position.z
						);
						points.push( Scene.createPoint( pos, 0.03, 0xA1DA42 ) );
					}
				}
			}
		}

		return { lines: lines, points: points };
	},


	/**
	 * Get all the connected border points starting from one of the border points.
	 * Returns one hole in the mesh, if there is at least one.
	 * @param  {THREE.Mesh}     model  The model to search holes in.
	 * @param  {Array<int>}     ignore Vertices that have already been searched and can be ignored now.
	 * @param  {Vertex}         start  Starting vertex.
	 * @return {THREE.Geometry}        Geometry of a hole.
	 */
	getNeighbouringBorderPoints: function( model, ignore, start ) {
		var geometry = new THREE.Geometry(),
		    bpStart = start,
		    bp = bpStart;
		var v;

		while( true ) {
			if( ignore.indexOf( bp.index ) < 0 && bp.isBorderPoint() ) {
				v = model.geometry.vertices[bp.index];
				geometry.vertices.push( v );
				ignore.push( bp.index );
				bp = bp.firstEdge.vertex;
			}
			else {
				geometry.vertices.push( model.geometry.vertices[bpStart.index] );
				break;
			}
		}

		return geometry;
	}

};
