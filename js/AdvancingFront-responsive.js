"use strict";


AdvancingFront.mode = "responsive";


/**
 * Apply AF rule 1 and organise heaps/angles.
 * @param  {THREE.Geometry} front   Current front of hole.
 * @param  {THREE.Geometry} filling Current filling of hole.
 * @param  {Angle}          angle   Current angle to handle.
 * @return {boolean}                Rule 1 doesn't create a new vertex, so it will always return false.
 */
AdvancingFront.applyRule1 = function( front, filling, angle ) {
	var vp = angle.vertices[0],
	    v = angle.vertices[1],
	    vn = angle.vertices[2];
	var vNew = this.rule1( front, filling, vp, v, vn );

	// Angle has successfully been processed.
	// Update neighbouring angles.
	if( vNew ) {
		var angleNext = angle.next,
		    anglePrev = angle.previous;

		this.heap.remove( anglePrev.degree );
		this.heap.remove( angleNext.degree );

		anglePrev.setVertices( [anglePrev.vertices[0], anglePrev.vertices[1], vn] );
		anglePrev.next = angleNext;

		angleNext.setVertices( [vp, angleNext.vertices[1], angleNext.vertices[2]] );
		angleNext.previous = anglePrev;

		this.heap.insert( anglePrev.degree, anglePrev );
		this.heap.insert( angleNext.degree, angleNext );
	}
	// It failed, so insert the Angle back in.
	else {
		angle.waitForUpdate = true;
		this.heap.insert( angle.degree, angle );
	}

	return false;
};


/**
 * Apply AF rule 2 and organise heaps/angles.
 * @param  {THREE.Geometry} front   Current front of hole.
 * @param  {THREE.Geometry} filling Current filling of hole.
 * @return {THREE.Vector3}          New vertex.
 */
AdvancingFront.applyRule2 = function( front, filling, angle ) {
	var vp = angle.vertices[0],
	    v = angle.vertices[1],
	    vn = angle.vertices[2];
	var vNew = this.rule2( front, filling, vp, v, vn );

	// Angle has successfully been processed.
	// Update the angle itself and neighbouring angles.
	if( vNew ) {
		var angleNext = angle.next,
		    anglePrev = angle.previous;

		angle.setVertices( [vp, vNew, vn] );

		this.heap.remove( anglePrev.degree );
		this.heap.remove( angleNext.degree );

		anglePrev.setVertices( [anglePrev.vertices[0], anglePrev.vertices[1], vNew] );
		angleNext.setVertices( [vNew, angleNext.vertices[1], angleNext.vertices[2]] );

		this.heap.insert( anglePrev.degree, anglePrev );
		this.heap.insert( angleNext.degree, angleNext );
	}
	else {
		angle.waitForUpdate = true;
	}
	// Otherwise don't update the Angles.
	this.heap.insert( angle.degree, angle );

	return vNew;
};


/**
 * Apply AF rule 3 and organise heaps/angles.
 * @param  {THREE.Geometry} front   Current front of hole.
 * @param  {THREE.Geometry} filling Current filling of hole.
 * @return {THREE.Vector3}          New vertex.
 */
AdvancingFront.applyRule3 = function( front, filling, angle ) {
	var vp = angle.vertices[0],
	    v = angle.vertices[1],
	    vn = angle.vertices[2];
	var vNew = this.rule3( front, filling, vp, v, vn, angle );

	// Angle has successfully been processed.
	// Update the angle itself, neighbouring angles and create a new one.
	if( vNew ) {
		var angleNext = angle.next,
		    anglePrev = angle.previous,
		    newAngle = new Angle( [v, vNew, vn] );

		this.heap.remove( angleNext.degree );

		newAngle.previous = angle;
		newAngle.next = angleNext;

		angle.setVertices( [vp, v, vNew] );
		angle.next = newAngle;

		angleNext.setVertices( [vNew, angleNext.vertices[1], angleNext.vertices[2]] );
		angleNext.previous = newAngle;

		this.heap.insert( newAngle.degree, newAngle );
		this.heap.insert( angleNext.degree, angleNext );
	}
	else {
		angle.waitForUpdate = true;
	}
	// Otherwise don't update the Angles.
	this.heap.insert( angle.degree, angle );

	return vNew;
};


/**
 * Check, if the sides of a triangle collide with a face of the filling and/or the whole model.
 * @param  {Array}          front   The current front of the hole.
 * @param  {THREE.Geometry} filling The current filling of the hole.
 * @param  {THREE.Vector3}  v       The vector to check.
 * @param  {THREE.Vector3}  fromA
 * @param  {THREE.Vector3}  fromB
 * @return {boolean}                True, if collision has been found, false otherwise.
 */
AdvancingFront.collisionTest = function( front, filling, v, fromA, fromB ) {
	var a, b, c, face;

	Stopwatch.start( "collision" );

	// Test the filling
	for( var i = 0, len = filling.faces.length; i < len; i++ ) {
		face = filling.faces[i];

		a = filling.vertices[face.a];
		b = filling.vertices[face.b];
		c = filling.vertices[face.c];

		if( a.equals( v ) || b.equals( v ) || c.equals( v ) ) {
			continue;
		}
		if( a.equals( fromA ) || b.equals( fromA ) || c.equals( fromA ) ) {
			continue;
		}
		if( fromB ) {
			if( a.equals( fromB ) || b.equals( fromB ) || c.equals( fromB ) ) {
				continue;
			}
		}

		if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
			Stopwatch.stop( "collision" );
			return true;
		}
	}

	// Test the whole model (without filling)
	if( this.collisionTestMode == "all" ) {
		for( var i = 0, len = this.modelGeo.faces.length; i < len; i++ ) {
			face = this.modelGeo.faces[i];

			a = this.modelGeo.vertices[face.a];
			b = this.modelGeo.vertices[face.b];
			c = this.modelGeo.vertices[face.c];

			if( a.equals( v ) || b.equals( v ) || c.equals( v ) ) {
				continue;
			}
			if( a.equals( fromA ) || b.equals( fromA ) || c.equals( fromA ) ) {
				continue;
			}
			if( fromB ) {
				if( a.equals( fromB ) || b.equals( fromB ) || c.equals( fromB ) ) {
					continue;
				}
			}

			if( Utils.checkIntersectionOfTriangles3D( a, b, c, v, fromA, fromB ) ) {
				Stopwatch.stop( "collision" );
				return true;
			}
		}
	}

	Stopwatch.stop( "collision" );

	return false;
};


/**
 * Get the rule function for the given angle.
 * @param  {float}    degree Angle in degree.
 * @return {Function}        The function to the rule, or false if none available.
 */
AdvancingFront.getRuleFunctionForAngle = function( degree ) {
	if( degree <= 75.0 ) {
		return this.applyRule1.bind( this );
	}
	else if( degree <= 135.0 ) {
		return this.applyRule2.bind( this );
	}
	else if( degree < 180.0 ) {
		return this.applyRule3.bind( this );
	}

	return false;
};


/**
 * Main loop
 */
AdvancingFront.mainLoop = function() {
	var vNew = false;
	var angle, ruleFunc;

	this.loopCounter++;

	// for debugging
	if( this.STOP_AFTER !== false && this.loopCounter > this.STOP_AFTER ) {
		this.wrapUp( this.front, this.filling );
		return;
	}

	// Close last hole
	if( this.front.vertices.length == 4 ) {
		this.filling = this.closeHole4( this.front, this.filling );
		this.wrapUp( this.front, this.filling );
		return;
	}
	else if( this.front.vertices.length == 3 ) {
		this.filling = this.closeHole3( this.front, this.filling );
		this.wrapUp( this.front, this.filling );
		return;
	}
	// Problematic/strange situations
	else if( this.front.vertices.length == 2 ) {
		console.warn( "front.vertices.length == 2" );
		this.wrapUp( this.front, this.filling );
		return;
	}
	else if( this.front.vertices.length == 1 ) {
		console.warn( "front.vertices.length == 1" );
		this.wrapUp( this.front, this.filling );
		return;
	}

	// Get next angle and apply rule
	if( this.heap.size() > 0 ) {
		angle = this.getNextAngle();
		ruleFunc = this.getRuleFunctionForAngle( angle.degree );

		if( ruleFunc == false ) {
			SceneManager.showFilling( this.front, this.filling );
			throw new Error( "No rule could be applied. Stopping before entering endless loop." );
		}

		vNew = ruleFunc( this.front, this.filling, angle );

		this.heap.sort();
	}
	else {
		SceneManager.showFilling( this.front, this.filling );
		throw new Error( "Hole has not been filled yet, but heap is empty." );
	}

	if( !vNew || this.front.vertices.length != 3 ) {
		// Compute the distances between each new created
		// vertex and see, if they can be merged.
		this.mergeByDistance( this.front, this.filling, vNew, this.hole );
	}

	// Update progress bar
	if( this.loopCounter % CONFIG.FILLING.PROGRESS_UPDATE == 0 ) {
		UI.updateProgress( 100 - Math.round( this.front.vertices.length / this.hole.length * 100 ) );
	}

	// Keep on looping
	setTimeout( function() { this.mainLoop(); }.bind( this ), 0 );
};


/**
 * Apply rule 1 of the advancing front mesh algorithm.
 * Rule 1: Close gaps of angles <= 75°.
 * @param {THREE.Geometry} front   The current border of the hole.
 * @param {THREE.Geometry} filling The currently filled part of the original hole.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 */
AdvancingFront.rule1 = function( front, filling, vp, v, vn ) {
	var vIndexFront = front.vertices.indexOf( v ),
	    vIndexFilling = filling.vertices.indexOf( v ),
	    vnIndexFilling = filling.vertices.indexOf( vn ),
	    vpIndexFilling = filling.vertices.indexOf( vp );

	if( this.collisionTest( front, filling, vp, vn ) ) {
		return false;
	}

	filling.faces.push( new THREE.Face3( vIndexFilling, vpIndexFilling, vnIndexFilling ) );

	// The vector v is not a part of the (moving) hole front anymore.
	front.vertices.splice( vIndexFront, 1 );

	return true;
};


/**
 * Apply rule 2 of the advancing front mesh algorithm.
 * Rule 2: Create one new vertex if the angle is > 75° and <= 135°.
 * @param {THREE.Geometry} front   The current border of the hole.
 * @param {THREE.Geometry} filling The currently filled part of the original hole.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 */
AdvancingFront.rule2 = function( front, filling, vp, v, vn ) {
	var vNew = this.rule2Calc( vp, v, vn );

	if( this.collisionTest( front, filling, vNew, vp, vn ) ) {
		return false;
	}

	// New vertex
	filling.vertices.push( vNew );

	// New faces for 2 new triangles
	var len = filling.vertices.length,
	    vIndexFront = front.vertices.indexOf( v ),
	    vpIndexFilling = filling.vertices.indexOf( vp ),
	    vIndexFilling = filling.vertices.indexOf( v ),
	    vnIndexFilling = filling.vertices.indexOf( vn );

	filling.faces.push( new THREE.Face3( vIndexFilling, vpIndexFilling, len - 1 ) );
	filling.faces.push( new THREE.Face3( vIndexFilling, len - 1, vnIndexFilling ) );

	// Update front
	front.vertices[vIndexFront] = vNew;

	return vNew;
};


/**
 * Apply rule 3 of the advancing front mesh algorithm.
 * Rule 3: Create a new vertex if the angle is > 135°.
 * @param {THREE.Geometry} front   The current border of the hole.
 * @param {THREE.Geometry} filling The currently filled part of the original hole.
 * @param {THREE.Vector3}  vp      Previous vector.
 * @param {THREE.Vector3}  v       Current vector.
 * @param {THREE.Vector3}  vn      Next vector.
 * @param {float}          angle   Angle created by these vectors.
 */
AdvancingFront.rule3 = function( front, filling, vp, v, vn, angle ) {
	var vNew = this.rule3Calc( vp, v, vn, angle );

	if( this.collisionTest( front, filling, vNew, vp, vn ) ) {
		return false;
	}

	// New vertex
	filling.vertices.push( vNew );

	// New face for the new triangle
	var len = filling.vertices.length,
	    vIndexFront = front.vertices.indexOf( v ),
	    vnIndexFilling = filling.vertices.indexOf( vn ),
	    vIndexFilling = filling.vertices.indexOf( v );

	filling.faces.push( new THREE.Face3( vnIndexFilling, vIndexFilling, len - 1 ) );

	// Update front
	front.vertices.splice( vIndexFront + 1, 0, vNew );

	return vNew;
};


/**
 * Fill the hole using the advancing front algorithm.
 * @param  {THREE.Geometry}    modelGeo       The model to fill the holes in.
 * @param  {Array<THREE.Line>} hole           The hole described by lines.
 * @param  {float}             mergeThreshold Threshold for merging.
 * @return {THREE.Geometry}                   The generated filling.
 */
AdvancingFront.start = function( modelGeo, hole, mergeThreshold, callback ) {
	this.callback = callback;
	this.hole = hole;
	this.holeIndex = SceneManager.holes.indexOf( this.hole );
	this.loopCounter = 0;
	this.mergeThreshold = mergeThreshold;
	this.modelGeo = modelGeo;

	this.filling = new THREE.Geometry();
	this.filling.vertices = this.hole.slice( 0 );
	this.filling.mergeVertices();

	this.front = new THREE.Geometry();
	this.front.vertices = this.hole.slice( 0 );
	this.front.mergeVertices();

	this.initHeap( this.front );
	this.mainLoop();
};
