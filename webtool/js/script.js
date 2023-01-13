/* ==========================================================================
   Copyright 2012 syssgx (http://github.com/syssgx)
 
   Code licensed under CC BY 3.0 licence
   http://creativecommons.org/licenses/by/3.0/
   ========================================================================== */
var fileNameLookup = {
	"ambushRoom" : "ambush",
	"bossoverlay": "bossoverlays",
	"bosses": "bossportraits",
	"costumes": "costumes2",
	"entities": "entities2",
	"preloads": "preload",
};


$(document).ready(function() {
	"use strict";

	(function () {
		if (window.validateXML) {
			$(".console").val("XML Validator loaded");
			$(".console").hide();
		} else {
			$(".console").val("xmllint not loaded");
		}
		window.prettyPrint && prettyPrint();
	})();
	
	var schemaData = 0, schemaFileName;

	// Workaround for HTTPS imports not working with this xsd validator library
	// preload referenced master xsd file for later use
	var refXML;
	var refAnnotations= {};
	var lastAnnotations;
	$.ajax({
		url: "https://wofsauge.github.io/isaac-xml-validator/isaacTypes.xsd",
		dataType: "xml",
		success: function(data){ 
			refXML = data;
			//create annotation map to improve user feedback
			for (let pattern of refXML.getElementsByTagName("xs:pattern")) {
				var annotation = pattern.parentNode.parentNode.getElementsByTagName("xs:documentation");
				if(annotation.length > 0){
					if(pattern.hasAttribute("value")){
						refAnnotations[pattern.getAttribute("value")] = annotation[0].innerHTML;
					}
				}
			}
			console.log(refAnnotations);
		},
		error: function(){
			alert("There was an error.");
		}
	});

	function loadXSDFile(fileName) {
		if (!fileName.trim()){
			return; // is empty
		}
		fileName = fileName.toLowerCase();
		if(fileNameLookup[fileName]){
			fileName = fileNameLookup[fileName];
		}
		fileName = fileName + ".xsd";
		if (fileName === schemaFileName){
			return;
		}

		$.ajax({
			url: "https://wofsauge.github.io/isaac-xml-validator/xsd/"+fileName,
			success: function(data){ 
				// Workaround for HTTPS imports not working with this xsd validator library
				// manually import the file content
				if(data.firstChild.hasAttribute("xmlns:xsisaac")){
					data.firstChild.removeAttribute("xmlns:xsisaac");
				}
				for (let c of data.firstChild.childNodes) {
					if(c.nodeName == "xs:import"){
						for(let importNode of refXML.firstChild.childNodes){
							if(importNode.nodeName != "#text"){
								c.parentNode.insertBefore(importNode, c);
							}
						}
						c.parentNode.removeChild(c);
						break;
					}
				}

				 schemaData = (new XMLSerializer()).serializeToString(data);
				 schemaData = schemaData.replaceAll("xsisaac:",""); // replace schema identifier, which no longer is needed due to manual import
				 schemaFileName = fileName;
				$(".valoutput").removeClass("valColor1").removeClass("valColor2");
				$(".valtext").text("File successfully detected: "+fileName.replace(".xsd",".xml")); 
			},
			error: function(){
				$(".valoutput").removeClass("valColor1").addClass("valColor2");
				$(".valtext").text("No XSD Schema file found for file: "+fileName); 
			}
		});
	}
	
	$(".close").alert();
	
	$("#textBtn").click(function() {
		if (editor1.getValue().length < 10) {
			$(".valoutput").removeClass("valColor1").removeClass("valColor2");
			$(".valtext").text("Enter XML Data"); 
			return;
		}
		
		$(".console").val("");		
		$(".valtext").text("Validating...");
		
		var Module = {
			xml: editor1.getValue(),
			schema: schemaData,
			arguments: ["--noout", "--schema", schemaFileName, schemaFileName.replace(".xsd",".xml")]
		};
		clearAnnotations();
		var result = validateXML(Module);
		xmlInfo(result, ".valoutput", ".valtext", ".console");
	});
	
	$("#clearBtn").click(function() {
		editor1.setValue(" ");
	});
	
	function xmlInfo(result, output1, output2, consoleprint) {
		var cval = $(consoleprint).val();
		var arrayOfLines = result.split('\n');
		arrayOfLines.forEach(item => {
			var line, element, attr;
			var lineIdent = item.split(":");
			var elementIdent = item.split(": Element '");
			var attrIdent = item.split(", attribute '");
			if (lineIdent.length > 1) line = lineIdent[1];
			if (elementIdent.length > 1) element = "<" + elementIdent[1].split("'")[0];
			if (attrIdent.length > 1) attr = attrIdent[1].split("'")[0] + "=";

			var query = attr || element;
			if (typeof query === "undefined" || typeof line === "undefined") return;
			lastAnnotations = editor1.showMatchesOnScrollbar(query, false, {"scrollButtonHeight":0, affectedLine:parseInt(line), maxMatches:1});
		});
		//apply annotations
		for (const key in refAnnotations) {
			result = result.replaceAll(key,key+" ("+refAnnotations[key]+")");
		}
		
		if (result.search("xml validates") > 0) {
			$(output1).removeClass("valColor2").addClass("valColor1");
			$(output2).text("Document validated successfully!");
			$(consoleprint).val(cval + result);
			$(".console").hide();
		} else {
			$(output1).removeClass("valColor1").addClass("valColor2");
			$(output2).text("Document does not validate. Output recorded in console.");
			$(consoleprint).val(cval + result);
			$(".console").show();
		}
	}
	
	var editor1 = CodeMirror.fromTextArea($("#xml_data")[0], {
	  mode: "application/xml",
	  lineNumbers: true,
	  lineWrapping: true,
	  darkTheme: "material-palenight",
	  theme: "material-palenight",
	  styleSelectedText: true,
	  extraKeys: {
        "F11": function(cm) {
          cm.setOption("fullScreen", !cm.getOption("fullScreen"));
        },
        "Esc": function(cm) {
          if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
        }
      }
	});

	var dropTriggered = false;
	CodeMirror.on(editor1, "drop", function() {
		dropTriggered = true;
	  });
	CodeMirror.on(editor1, "change", function() {
		if (dropTriggered){
			editor1.setSelection({line:0,ch:0});
			dropTriggered = false;
		}
	  for (let index = 0; index < editor1.lineCount(); index++) {
		  var line = editor1.getLine(index);
		  if (!line.trim().startsWith("<!") && line.trim().startsWith("<")){
			  var xsdFileName = line.trim().replace(">","").split("<")[1].split(" ")[0];
			  loadXSDFile(xsdFileName);
			  break;
		  }
	  }
	});
	editor1.setValue(" ");
	function clearAnnotations() {
		if(!lastAnnotations) return;
		editor1.doc.getAllMarks().forEach(marker => marker.clear());
		lastAnnotations.clear();
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
  
	CodeMirror.defineOption("fullScreen", false, function(cm, val, old) {
	  if (old == CodeMirror.Init) old = false;
	  if (!old == !val) return;
	  if (val) setFullscreen(cm);
	  else setNormal(cm);
	});
  
	function setFullscreen(cm) {
	  var wrap = cm.getWrapperElement();
	  cm.state.fullScreenRestore = {scrollTop: window.pageYOffset, scrollLeft: window.pageXOffset,
									width: wrap.style.width, height: wrap.style.height};
	  wrap.style.width = "";
	  wrap.style.height = "auto";
	  wrap.className += " CodeMirror-fullscreen";
	  document.documentElement.style.overflow = "hidden";
	  cm.refresh();
	}
  
	function setNormal(cm) {
	  var wrap = cm.getWrapperElement();
	  wrap.className = wrap.className.replace(/\s*CodeMirror-fullscreen\b/, "");
	  document.documentElement.style.overflow = "";
	  var info = cm.state.fullScreenRestore;
	  wrap.style.width = info.width; wrap.style.height = info.height;
	  window.scrollTo(info.scrollLeft, info.scrollTop);
	  cm.refresh();
	}
  });