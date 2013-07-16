var AreaText = Path.extend({
	_class: 'AreaText',
	_serializeFields: {
		text: null
	},
	initialize: function AreaText(path, createText) {
		this._text = null;
		if (path && Base.isPlainObject(path)) {
			Path.call(this, null);
			this._set(path);
			if (!this._text && !!createText) {
				this.setText();
			} else if (!!this._text) {
				this.setText(this._text);
			}

			// Use default styles
			for (var key in this.style._defaults) {
				this.style[key] = (key in path)
					? path[key]
					: this.style._defaults[key];
			}

			this.setColorStyle(
				this.style.fillColor,
				this.style.strokeColor
			);
			this.setFontStyle(
				parseInt(this.fontSize),
				this.leading,
				this.font
			);
		} else {
			Path.call(this, path);
			if (!!createText) {
				this.setText();
			}
		}
	},

	setText: function(text) {
		this._text = text || new TextItem(this.bounds.topLeft);
		this._text.remove();
	},

	getText: function() {
		return this._text;
	},

	_clone: function() {
		var clone = Path.prototype._clone.apply(this, arguments);
		clone._text && clone._text.remove();
		return clone;
	},

	clone: function() {
		var clone = this._clone(new AreaText(this._segments));
		clone._closed = this._closed;
		if (this._clockwise !== undefined)
			clone._clockwise = this._clockwise;

		clone.setText(this.text.clone());
		clone.cssFillColor = this.cssFillColor;
		clone.cssStrokeColor = this.cssStrokeColor;
		return clone;
	},

	_draw: function(ctx) {
		if (!this.text || !this.text._content)
			return;
		this._setStyles(ctx);
		var style = this._style,
			lines = this.text._lines,
			leading = style.getLeading(),
			maxWidth = this.bounds.width,
			maxHeight = this.bounds.height,
			currentHeight = 0;

		if (maxWidth == 0 || maxHeight == 0) {
			return;
		}

		ctx.font = style.getFontStyle();
		ctx.textAlign = style.getJustification();
		ctx.translate(
			this.bounds.topLeft.x + 1,
			this.bounds.topLeft.y + parseInt(this.fontSize || 0) - 1
		);

		var testLine = function(words, separator) {
			var line = [];
			for (var n = 0; n < words.length; n++) {
				line.push(words[n]);
				var metrics = ctx.measureText(line.join(separator));
				if (metrics.width > maxWidth) {
					var word = line.pop();
					if (line.length > 0) {
						writeLine(line.join(separator));
						n--;
					} else {
						line = testLine(word, '');
						writeLine(line.join(''));
					}
					line = [];
				}
			}
			return line;
		};

		var writeLine = function(line) {
			if (currentHeight + leading > maxHeight) {
				return;
			}

			if (style.getFillColor()) {
				ctx.fillText(line, 0, 0);
			}
			if (style.getStrokeColor()) {
				ctx.strokeText(line, 0, 0);
			}
			ctx.translate(0, leading);
			currentHeight += leading;
		};

		for (var i = 0, l = lines.length; i < l; i++) {
			var words = lines[i].split(' ');

			var line = testLine(words, ' ');
			if (line.length > 0) {
				writeLine(line.join(' '));
			}
		}
	}
}, new function() {
	return {
		setColorStyle: function(color, strokeColor) {
			this.style.fillColor = color;
			this.style.strokeColor = strokeColor;
			this.cssFillColor = color;
			this.cssStrokeColor = color;
		},
		setFontStyle: function(fontSize, leading, fontFamily) {
			leading = leading || fontSize * 1.2;

			this.fontSize = fontSize + 'px';
			this.leading = leading;
			if (!!fontFamily) {
				this.font = fontFamily;
			}
		}
	};
});