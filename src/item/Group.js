/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2013, Juerg Lehni & Jonathan Puckey
 * http://lehni.org/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Group
 *
 * @class A Group is a collection of items. When you transform a Group, its
 * children are treated as a single unit without changing their relative
 * positions.
 *
 * @extends Item
 */
var Group = Item.extend(/** @lends Group# */{
	_class: 'Group',
	_serializeFields: {
		children: []
	},

	// DOCS: document new Group(item, item...);
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Item[]} [children] An array of children that will be added to the
	 * newly created group.
	 *
	 * @example {@paperscript}
	 * // Create a group containing two paths:
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a group from the two paths:
	 * var group = new Group([path, path2]);
	 *
	 * // Set the stroke color of all items in the group:
	 * group.strokeColor = 'black';
	 *
	 * // Move the group to the center of the view:
	 * group.position = view.center;
	 *
	 * @example {@paperscript height=320}
	 * // Click in the view to add a path to the group, which in turn is rotated
	 * // every frame:
	 * var group = new Group();
	 *
	 * function onMouseDown(event) {
	 * 	// Create a new circle shaped path at the position
	 * 	// of the mouse:
	 * 	var path = new Path.Circle(event.point, 5);
	 * 	path.fillColor = 'black';
	 *
	 * 	// Add the path to the group's children list:
	 * 	group.addChild(path);
	 * }
	 *
	 * function onFrame(event) {
	 * 	// Rotate the group by 1 degree from
	 * 	// the centerpoint of the view:
	 * 	group.rotate(1, view.center);
	 * }
	 */
	/**
	 * Creates a new Group item and places it at the top of the active layer.
	 *
	 * @name Group#initialize
	 * @param {Object} object An object literal containing properties to be
	 * set on the Group.
	 *
	 * @example {@paperscript}
	 * var path = new Path([100, 100], [100, 200]);
	 * var path2 = new Path([50, 150], [150, 150]);
	 *
	 * // Create a group from the two paths:
	 * var group = new Group({
	 * 	children: [path, path2],
	 * 	// Set the stroke color of all items in the group:
	 * 	strokeColor: 'black',
	 * 	// Move the group to the center of the view:
	 * 	position: view.center
	 * });
	 */
	initialize: function Group(arg) {
		Item.call(this);
		// Allow Group to have children and named children
		this._children = [];
		this._namedChildren = {};
		this.compositing = 'source-in';
		if (arg && !this._set(arg))
			this.addChildren(Array.isArray(arg) ? arg : arguments);
	},

	_changed: function _changed(flags) {
		_changed.base.call(this, flags);
		if (flags & /*#=*/ ChangeFlag.HIERARCHY && this._transformContent
				&& !this._matrix.isIdentity()) {
			// Apply matrix now that we have content.
			this.applyMatrix();
		}
		if (flags & (/*#=*/ ChangeFlag.HIERARCHY | /*#=*/ ChangeFlag.CLIPPING)) {
			// Clear cached clip item whenever hierarchy changes
			delete this._clipItems;
		}
	},

	_getClipItems: function() {
		this._clipItems = [];
		for (var i = 0, l = this._children.length; i < l; i++) {
			var child = this._children[i];
			if (child._clipMask) {
				this._clipItems.push(child);
			}
		}

		return this._clipItems;
	},

	/**
	 * Specifies whether the group applies transformations directly to its
	 * children, or wether they are to be stored in its {@link Item#matrix}
	 *
	 * @type Boolean
	 * @default true
	 * @bean
	 */
	getTransformContent: function() {
		return this._transformContent;
	},

	setTransformContent: function(transform) {
		this._transformContent = transform;
		if (transform)
			this.applyMatrix();
	},

	/**
	 * Specifies whether the group item is to be clipped.
	 * When setting to {@code true}, the first child in the group is
	 * automatically defined as the clipping mask.
	 *
	 * @type Boolean
	 * @bean
	 *
	 * @example {@paperscript}
	 * var star = new Path.Star({
	 * 	center: view.center,
	 * 	points: 6,
	 * 	radius1: 20,
	 * 	radius2: 40,
	 * 	fillColor: 'red'
	 * });
	 *
	 * var circle = new Path.Circle({
	 * 	center: view.center,
	 * 	radius: 25,
	 * 	strokeColor: 'black'
	 * });
	 *
	 * // Create a group of the two items and clip it:
	 * var group = new Group(circle, star);
	 * group.clipped = true;
	 *
	 * // Lets animate the circle:
	 * function onFrame(event) {
	 * 	var offset = Math.sin(event.count / 30) * 30;
	 * 	circle.position.x = view.center.x + offset;
	 * }
	 */
	isClipped: function() {
		return this._getClipItems().length > 0;
	},

	setClipped: function(clipped) {
		var child = this.getFirstChild();
		if (child)
			child.setClipMask(clipped);
	},

	/**
	 * Overridden and inspired by this fork:
	 * https://github.com/luckyvoice/paper.js/compare/b94e627b0199828ea12f577cea8d44b3800480e7...c48b853f02cff963aaf0dc862b78e76efd9f487e
	 *
	 * That fork sets it up so that paper will actually use composite operations instead of just
	 * clipping content. Unfortunately, with the way it was run, it would run all of the composites
	 * first, regardless of when they were created. So in the case of an eraser, if you drew on a board,
	 * erased, drew again, and then erased, suddenly the first eraser would have modified the second
	 * drawing.
	 *
	 * So what we end up needing to do is running through the children in order and applying
	 * the composite operations as we find them to the children that are actually drawn. You
	 * can also mark items as unclippable, in which case they will be drawn on after (and
	 * 'on top of') the other items, in the order they were added.
	 */
	_draw: function(ctx, param) {
		var clipItems = this._getClipItems(),
			hasClipItems = clipItems.length > 0;
		if (hasClipItems) {
			var bounds = this.getStrokeBounds();
			if (!bounds.width || !bounds.height) {
				return;
			}
			// Floor the offset and ceil the size, so we don't cut off any
			// antialiased pixels when drawing onto the temporary canvas.
			param.offset = bounds.getTopLeft().floor();
		}

		var unclippable = [];
		for (var i = 0; i < this._children.length; i++) {
			var item = this._children[i];
			if (item.isClipMask()) {
				var origComposite = ctx.globalCompositeOperation;
				ctx.globalCompositeOperation = this.compositing;
				item.draw(ctx, param);
				ctx.globalCompositeOperation = origComposite;
			} else if (hasClipItems && !item.isClippable()) {
				unclippable.push(item);
			} else {
				item.draw(ctx, param);
			}
		}

		for (var key in unclippable) {
			unclippable[key].draw(ctx, param);
		}
	},

	/**
	 * Don't returns groups/layers during hit tests. Should make this an option.
	 */
	_hitTestSelf: function() {
		return null;
	},

	/**
	 * Add ability to exclude children during serialization.
	 */
	_serialize: function _serialize(options, dictionary) {
		options = options || {};
		if (!!options.excludeChildren) {
			delete this._serializeFields.children;
		}
		var serialized = _serialize.base.apply(this, arguments);
		if (!!options.excludeChildren) {
			this._serializeFields.children = [];
		}

		return serialized;
	}
});
