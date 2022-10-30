// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

// Highlighting text that matches the selection
//
// Defines an option highlightSelectionMatches, which, when enabled,
// will style strings that match the selection throughout the
// document.
//
// The option can be set to true to simply enable it, or to a
// {minChars, style, wordsOnly, showToken, delay} object to explicitly
// configure it. minChars is the minimum amount of characters that should be
// selected for the behavior to occur, and style is the token style to
// apply to the matches. This will be prefixed by "cm-" to create an
// actual CSS class name. If wordsOnly is enabled, the matches will be
// highlighted only if the selected text is a word. showToken, when enabled,
// will cause the current token to be highlighted when nothing is selected.
// delay is used to specify how much time to wait, in milliseconds, before
// highlighting the matches. If annotateScrollbar is enabled, the occurrences
// will be highlighted on the scrollbar via the matchesonscrollbar addon.

(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
	  mod(require("../../lib/codemirror"), require("./matchesonscrollbar"));
	else if (typeof define == "function" && define.amd) // AMD
	  define(["../../lib/codemirror", "./matchesonscrollbar"], mod);
	else // Plain browser env
	  mod(CodeMirror);
  })(function(CodeMirror) {
	"use strict";
  
	var defaults = {
	  style: "matchhighlight",
	  minChars: 2,
	  delay: 100,
	  wordsOnly: false,
	  annotateScrollbar: false,
	  showToken: false,
	  trim: true
	}
  
	function State(options) {
	  this.options = {}
	  for (var name in defaults)
		this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name]
	  this.overlay = this.timeout = null;
	  this.matchesonscroll = null;
	  this.active = false;
	}
  
	CodeMirror.defineOption("highlightSelectionMatches", false, function(cm, val, old) {
	  if (old && old != CodeMirror.Init) {
		removeOverlay(cm);
		clearTimeout(cm.state.matchHighlighter.timeout);
		cm.state.matchHighlighter = null;
		cm.off("cursorActivity", cursorActivity);
		cm.off("focus", onFocus)
	  }
	  if (val) {
		var state = cm.state.matchHighlighter = new State(val);
		if (cm.hasFocus()) {
		  state.active = true
		  highlightMatches(cm)
		} else {
		  cm.on("focus", onFocus)
		}
		cm.on("cursorActivity", cursorActivity);
	  }
	});
  
	function cursorActivity(cm) {
	  var state = cm.state.matchHighlighter;
	  if (state.active || cm.hasFocus()) scheduleHighlight(cm, state)
	}
  
	function onFocus(cm) {
	  var state = cm.state.matchHighlighter
	  if (!state.active) {
		state.active = true
		scheduleHighlight(cm, state)
	  }
	}
  
	function scheduleHighlight(cm, state) {
	  clearTimeout(state.timeout);
	  state.timeout = setTimeout(function() {highlightMatches(cm);}, state.options.delay);
	}
  
	function addOverlay(cm, query, hasBoundary, style) {
	  var state = cm.state.matchHighlighter;
	  cm.addOverlay(state.overlay = makeOverlay(query, hasBoundary, style));
	  if (state.options.annotateScrollbar && cm.showMatchesOnScrollbar) {
		var searchFor = hasBoundary ? new RegExp((/\w/.test(query.charAt(0)) ? "\\b" : "") +
												 query.replace(/[\\\[.+*?(){|^$]/g, "\\$&") +
												 (/\w/.test(query.charAt(query.length - 1)) ? "\\b" : "")) : query;
		state.matchesonscroll = cm.showMatchesOnScrollbar(searchFor, false,
		  {className: "CodeMirror-selection-highlight-scrollbar"});
	  }
	}
  
	function removeOverlay(cm) {
	  var state = cm.state.matchHighlighter;
	  if (state.overlay) {
		cm.removeOverlay(state.overlay);
		state.overlay = null;
		if (state.matchesonscroll) {
		  state.matchesonscroll.clear();
		  state.matchesonscroll = null;
		}
	  }
	}
  
	function highlightMatches(cm) {
	  cm.operation(function() {
		var state = cm.state.matchHighlighter;
		removeOverlay(cm);
		if (!cm.somethingSelected() && state.options.showToken) {
		  var re = state.options.showToken === true ? /[\w$]/ : state.options.showToken;
		  var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch, end = start;
		  while (start && re.test(line.charAt(start - 1))) --start;
		  while (end < line.length && re.test(line.charAt(end))) ++end;
		  if (start < end)
			addOverlay(cm, line.slice(start, end), re, state.options.style);
		  return;
		}
		var from = cm.getCursor("from"), to = cm.getCursor("to");
		if (from.line != to.line) return;
		if (state.options.wordsOnly && !isWord(cm, from, to)) return;
		var selection = cm.getRange(from, to)
		if (state.options.trim) selection = selection.replace(/^\s+|\s+$/g, "")
		if (selection.length >= state.options.minChars)
		  addOverlay(cm, selection, false, state.options.style);
	  });
	}
  
	function isWord(cm, from, to) {
	  var str = cm.getRange(from, to);
	  if (str.match(/^\w+$/) !== null) {
		  if (from.ch > 0) {
			  var pos = {line: from.line, ch: from.ch - 1};
			  var chr = cm.getRange(pos, from);
			  if (chr.match(/\W/) === null) return false;
		  }
		  if (to.ch < cm.getLine(from.line).length) {
			  var pos = {line: to.line, ch: to.ch + 1};
			  var chr = cm.getRange(to, pos);
			  if (chr.match(/\W/) === null) return false;
		  }
		  return true;
	  } else return false;
	}
  
	function boundariesAround(stream, re) {
	  return (!stream.start || !re.test(stream.string.charAt(stream.start - 1))) &&
		(stream.pos == stream.string.length || !re.test(stream.string.charAt(stream.pos)));
	}
  
	function makeOverlay(query, hasBoundary, style) {
	  return {token: function(stream) {
		if (stream.match(query) &&
			(!hasBoundary || boundariesAround(stream, hasBoundary)))
		  return style;
		stream.next();
		stream.skipTo(query.charAt(0)) || stream.skipToEnd();
	  }};
	}
  });





  // CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
	  mod(require("../../lib/codemirror"));
	else if (typeof define == "function" && define.amd) // AMD
	  define(["../../lib/codemirror"], mod);
	else // Plain browser env
	  mod(CodeMirror);
  })(function(CodeMirror) {
	"use strict";
  
	CodeMirror.defineExtension("annotateScrollbar", function(options) {
	  if (typeof options == "string") options = {className: options};
	  return new Annotation(this, options);
	});
  
	CodeMirror.defineOption("scrollButtonHeight", 0);
  
	function Annotation(cm, options) {
	  this.cm = cm;
	  this.options = options;
	  this.buttonHeight = options.scrollButtonHeight || cm.getOption("scrollButtonHeight");
	  this.annotations = [];
	  this.doRedraw = this.doUpdate = null;
	  this.div = cm.getWrapperElement().appendChild(document.createElement("div"));
	  this.div.style.cssText = "position: absolute; right: 0; top: 0; z-index: 7; pointer-events: none";
	  this.computeScale();
  
	  function scheduleRedraw(delay) {
		clearTimeout(self.doRedraw);
		self.doRedraw = setTimeout(function() { self.redraw(); }, delay);
	  }
  
	  var self = this;
	  cm.on("refresh", this.resizeHandler = function() {
		clearTimeout(self.doUpdate);
		self.doUpdate = setTimeout(function() {
		  if (self.computeScale()) scheduleRedraw(20);
		}, 100);
	  });
	  cm.on("markerAdded", this.resizeHandler);
	  cm.on("markerCleared", this.resizeHandler);
	  if (options.listenForChanges !== false)
		cm.on("changes", this.changeHandler = function() {
		  scheduleRedraw(250);
		});
	}
  
	Annotation.prototype.computeScale = function() {
	  var cm = this.cm;
	  var hScale = (cm.getWrapperElement().clientHeight - cm.display.barHeight - this.buttonHeight * 2) /
		cm.getScrollerElement().scrollHeight
	  if (hScale != this.hScale) {
		this.hScale = hScale;
		return true;
	  }
	};
  
	Annotation.prototype.update = function(annotations) {
	  this.annotations = annotations;
	  this.redraw();
	};
  
	Annotation.prototype.redraw = function(compute) {
	  if (compute !== false) this.computeScale();
	  var cm = this.cm, hScale = this.hScale;
  
	  var frag = document.createDocumentFragment(), anns = this.annotations;
  
	  var wrapping = cm.getOption("lineWrapping");
	  var singleLineH = wrapping && cm.defaultTextHeight() * 1.5;
	  var curLine = null, curLineObj = null;
  
	  function getY(pos, top) {
		if (curLine != pos.line) {
		  curLine = pos.line
		  curLineObj = cm.getLineHandle(pos.line)
		  var visual = cm.getLineHandleVisualStart(curLineObj)
		  if (visual != curLineObj) {
			curLine = cm.getLineNumber(visual)
			curLineObj = visual
		  }
		}
		if ((curLineObj.widgets && curLineObj.widgets.length) ||
			(wrapping && curLineObj.height > singleLineH))
		  return cm.charCoords(pos, "local")[top ? "top" : "bottom"];
		var topY = cm.heightAtLine(curLineObj, "local");
		return topY + (top ? 0 : curLineObj.height);
	  }
  
	  var lastLine = cm.lastLine()
	  if (cm.display.barWidth) for (var i = 0, nextTop; i < anns.length; i++) {
		var ann = anns[i];
		if (ann.to.line > lastLine) continue;
		var top = nextTop || getY(ann.from, true) * hScale;
		var bottom = getY(ann.to, false) * hScale;
		while (i < anns.length - 1) {
		  if (anns[i + 1].to.line > lastLine) break;
		  nextTop = getY(anns[i + 1].from, true) * hScale;
		  if (nextTop > bottom + .9) break;
		  ann = anns[++i];
		  bottom = getY(ann.to, false) * hScale;
		}
		if (bottom == top) continue;
		var height = Math.max(bottom - top, 3);
  
		var elt = frag.appendChild(document.createElement("div"));
		elt.style.cssText = "position: absolute; right: 0px; width: " + Math.max(cm.display.barWidth - 1, 2) + "px; top: "
		  + (top + this.buttonHeight) + "px; height: " + height + "px";
		elt.className = this.options.className;
		if (ann.id) {
		  elt.setAttribute("annotation-id", ann.id);
		}
	  }
	  this.div.textContent = "";
	  this.div.appendChild(frag);
	};
  
	Annotation.prototype.clear = function() {
	  this.cm.off("refresh", this.resizeHandler);
	  this.cm.off("markerAdded", this.resizeHandler);
	  this.cm.off("markerCleared", this.resizeHandler);
	  if (this.changeHandler) this.cm.off("changes", this.changeHandler);
	  this.div.parentNode.removeChild(this.div);
	};
  });

  // CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
	  mod(require("../../lib/codemirror"), require("./searchcursor"), require("../scroll/annotatescrollbar"));
	else if (typeof define == "function" && define.amd) // AMD
	  define(["../../lib/codemirror", "./searchcursor", "../scroll/annotatescrollbar"], mod);
	else // Plain browser env
	  mod(CodeMirror);
  })(function(CodeMirror) {
	"use strict";
  
	CodeMirror.defineExtension("showMatchesOnScrollbar", function(query, caseFold, options) {
	  if (typeof options == "string") options = {className: options};
	  if (!options) options = {};
	  return new SearchAnnotation(this, query, caseFold, options);
	});
  
	function SearchAnnotation(cm, query, caseFold, options) {
	  this.cm = cm;
	  this.options = options;
	  var annotateOptions = {listenForChanges: false};
	  for (var prop in options) annotateOptions[prop] = options[prop];
	  if (!annotateOptions.className) annotateOptions.className = "CodeMirror-search-match";
	  this.annotation = cm.annotateScrollbar(annotateOptions);
	  this.query = query;
	  this.caseFold = caseFold;
	  this.gap = {from: cm.firstLine(), to: cm.lastLine() + 1};
	  this.matches = [];
	  this.matchHighlights = [];
	  this.update = null;
  
	  this.findMatches();
	  this.annotation.update(this.matches);
  
	  var self = this;
	  cm.on("change", this.changeHandler = function(_cm, change) { self.onChange(change); });
	}
  
	var MAX_MATCHES = 1000;
  
	SearchAnnotation.prototype.findMatches = function() {
	  if (!this.gap) return;
	  for (var i = 0; i < this.matches.length; i++) {
		var match = this.matches[i];
		if (match.from.line >= this.gap.to) break;
		if (match.to.line >= this.gap.from) this.matches.splice(i--, 1);
	  }
	  var affectedLine = this.options && this.options.affectedLine || 0; //added
	  var cursor = this.cm.getSearchCursor(this.query, CodeMirror.Pos(affectedLine-3, affectedLine+3), {caseFold: this.caseFold, multiline: this.options.multiline});
	  var maxMatches = this.options && this.options.maxMatches || MAX_MATCHES;
	  while (cursor.findNext()) {
		var match = {from: cursor.from(), to: cursor.to()};
		if (match.from.line >= this.gap.to) break;
		if (typeof affectedLine !== "undefined" && match.from.line != affectedLine-1) continue; //added
		var highlight = this.cm.markText(cursor.from(), cursor.to(), {className: "cm-error"});
		this.matchHighlights.splice(i++, 0, highlight);
		this.matches.splice(i++, 0, match);
		if (this.matches.length >= maxMatches) break;
	  }
	  this.gap = null;
	};
  
	function offsetLine(line, changeStart, sizeChange) {
	  if (line <= changeStart) return line;
	  return Math.max(changeStart, line + sizeChange);
	}
  
	SearchAnnotation.prototype.onChange = function(change) {
	  var startLine = change.from.line;
	  var endLine = CodeMirror.changeEnd(change).line;
	  var sizeChange = endLine - change.to.line;
	  if (this.gap) {
		this.gap.from = Math.min(offsetLine(this.gap.from, startLine, sizeChange), change.from.line);
		this.gap.to = Math.max(offsetLine(this.gap.to, startLine, sizeChange), change.from.line);
	  } else {
		this.gap = {from: change.from.line, to: endLine + 1};
	  }
  
	  if (sizeChange) for (var i = 0; i < this.matches.length; i++) {
		var match = this.matches[i];
		var newFrom = offsetLine(match.from.line, startLine, sizeChange);
		if (newFrom != match.from.line) match.from = CodeMirror.Pos(newFrom, match.from.ch);
		var newTo = offsetLine(match.to.line, startLine, sizeChange);
		if (newTo != match.to.line) match.to = CodeMirror.Pos(newTo, match.to.ch);
	  }
	  clearTimeout(this.update);
	  var self = this;
	  this.update = setTimeout(function() { self.updateAfterChange(); }, 250);
	};
  
	SearchAnnotation.prototype.updateAfterChange = function() {
	  this.findMatches();
	  this.annotation.update(this.matches);
	};
  
	SearchAnnotation.prototype.clear = function() {
	  this.cm.off("change", this.changeHandler);
	  this.annotation.clear();
	};
  });

  // CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

// Because sometimes you need to mark the selected *text*.
//
// Adds an option 'styleSelectedText' which, when enabled, gives
// selected text the CSS class given as option value, or
// "CodeMirror-selectedtext" when the value is not a string.

(function(mod) {
	if (typeof exports == "object" && typeof module == "object") // CommonJS
	  mod(require("../../lib/codemirror"));
	else if (typeof define == "function" && define.amd) // AMD
	  define(["../../lib/codemirror"], mod);
	else // Plain browser env
	  mod(CodeMirror);
  })(function(CodeMirror) {
	"use strict";
  
	CodeMirror.defineOption("styleSelectedText", false, function(cm, val, old) {
	  var prev = old && old != CodeMirror.Init;
	  if (val && !prev) {
		cm.state.markedSelection = [];
		cm.state.markedSelectionStyle = typeof val == "string" ? val : "CodeMirror-selectedtext";
		reset(cm);
		cm.on("cursorActivity", onCursorActivity);
		cm.on("change", onChange);
	  } else if (!val && prev) {
		cm.off("cursorActivity", onCursorActivity);
		cm.off("change", onChange);
		clear(cm);
		cm.state.markedSelection = cm.state.markedSelectionStyle = null;
	  }
	});
  
	function onCursorActivity(cm) {
	  if (cm.state.markedSelection)
		cm.operation(function() { update(cm); });
	}
  
	function onChange(cm) {
	  if (cm.state.markedSelection && cm.state.markedSelection.length)
		cm.operation(function() { clear(cm); });
	}
  
	var CHUNK_SIZE = 8;
	var Pos = CodeMirror.Pos;
	var cmp = CodeMirror.cmpPos;
  
	function coverRange(cm, from, to, addAt) {
	  if (cmp(from, to) == 0) return;
	  var array = cm.state.markedSelection;
	  var cls = cm.state.markedSelectionStyle;
	  for (var line = from.line;;) {
		var start = line == from.line ? from : Pos(line, 0);
		var endLine = line + CHUNK_SIZE, atEnd = endLine >= to.line;
		var end = atEnd ? to : Pos(endLine, 0);
		var mark = cm.markText(start, end, {className: cls});
		if (addAt == null) array.push(mark);
		else array.splice(addAt++, 0, mark);
		if (atEnd) break;
		line = endLine;
	  }
	}
  
	function clear(cm) {
	  var array = cm.state.markedSelection;
	  for (var i = 0; i < array.length; ++i) array[i].clear();
	  array.length = 0;
	}
  
	function reset(cm) {
	  clear(cm);
	  var ranges = cm.listSelections();
	  for (var i = 0; i < ranges.length; i++)
		coverRange(cm, ranges[i].from(), ranges[i].to());
	}
  
	function update(cm) {
	  if (!cm.somethingSelected()) return clear(cm);
	  if (cm.listSelections().length > 1) return reset(cm);
  
	  var from = cm.getCursor("start"), to = cm.getCursor("end");
  
	  var array = cm.state.markedSelection;
	  if (!array.length) return coverRange(cm, from, to);
  
	  var coverStart = array[0].find(), coverEnd = array[array.length - 1].find();
	  if (!coverStart || !coverEnd || to.line - from.line <= CHUNK_SIZE ||
		  cmp(from, coverEnd.to) >= 0 || cmp(to, coverStart.from) <= 0)
		return reset(cm);
  
	  while (cmp(from, coverStart.from) > 0) {
		array.shift().clear();
		coverStart = array[0].find();
	  }
	  if (cmp(from, coverStart.from) < 0) {
		if (coverStart.to.line - from.line < CHUNK_SIZE) {
		  array.shift().clear();
		  coverRange(cm, from, coverStart.to, 0);
		} else {
		  coverRange(cm, from, coverStart.from, 0);
		}
	  }
  
	  while (cmp(to, coverEnd.to) < 0) {
		array.pop().clear();
		coverEnd = array[array.length - 1].find();
	  }
	  if (cmp(to, coverEnd.to) > 0) {
		if (to.line - coverEnd.from.line < CHUNK_SIZE) {
		  array.pop().clear();
		  coverRange(cm, coverEnd.from, to);
		} else {
		  coverRange(cm, coverEnd.to, to);
		}
	  }
	}
  });