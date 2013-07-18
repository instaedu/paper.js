var AreaText = Path.extend({
	_class: 'AreaText',
	_serializeFields: {
		text: null
	},
	initialize: function AreaText(path) {
		this._text = null;
		if (path && Base.isPlainObject(path)) {
			Path.call(this, null);
			this._set(path);
			this.setText(this._text);

			this.setColorStyle();
			this.setFontStyle();
		} else {
			Path.call(this, path);
			this.setText();
		}
	},

	setText: function(text) {
		this._text = text || new TextItem(this.bounds.topLeft);
		this._text.remove();
		this.setColorStyle();
		this.setFontStyle();
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
		this.text._setStyles(ctx);
		var style = this.text._style,
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
			this.bounds.topLeft.y + parseInt(this.text.fontSize || 0) - 1
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
			if (arguments.length == 0) {
				color = this._text.fillColor;
				strokeColor = this._text.strokeColor;
			}

			this._text.fillColor = color;
			this._text.strokeColor = strokeColor;
			this.cssFillColor = color;
			this.cssStrokeColor = color;
		},
		setFontStyle: function(fontSize, leading, fontFamily) {
			if (arguments.length == 0) {
				fontSize = parseInt(this._text.fontSize);
				leading = this._text.leading;
				fontFamily = this._text.font;
			} else {
				leading = leading || fontSize * 1.2;
			}

			this._text.fontSize = fontSize + 'px';
			this._text.leading = leading;
			if (!!fontFamily) {
				this._text.font = fontFamily;
			}
		}
	};
});