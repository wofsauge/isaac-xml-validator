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
	
	var xmlData = 0, schemaData = 0,
		xmlFileName, schemaFileName;

	// Workaround for HTTPS imports not working with this xsd validator library
	// preload referenced master xsd file for later use
	var refXML;
	$.ajax({
		url: "https://wofsauge.github.io/Isaac-XML-Validator/isaacTypes.xsd",
		dataType: "xml",
		success: function(data){ 
			refXML = data;
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
			url: "https://wofsauge.github.io/Isaac-XML-Validator/xsd/"+fileName,
			success: function(data){ 
				// Workaround for HTTPS imports not working with this xsd validator library
				// manually import the file content
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
				 schemaData = schemaData.replace("xsisaac:",""); // replace schema identifier, which no longer is needed due to manual import
				 schemaFileName = fileName;

				$(".valoutput").removeClass("valColor1").removeClass("valColor2");
				$(".valtext").text("File loaded successfully: "+fileName); 
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
		var result = validateXML(Module);
		xmlInfo(result, ".valoutput", ".valtext", ".console");
	});
	
	$("#clearBtn").click(function() {
		editor1.setValue(" ");
	});
	
	function xmlInfo(result, output1, output2, consoleprint) {
		var cval = $(consoleprint).val();
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
	  theme: "night",
	  onCursorActivity: function() {
		editor1.setLineClass(hlLine1, null);
		hlLine1 = editor1.setLineClass(editor1.getCursor().line, "activeline");
		editor1.matchHighlight("CodeMirror-matchhighlight");
		var xsdFileName = editor1.getLine(0).trim().replace(">","").split("<")[1].split(" ")[0];
		loadXSDFile(xsdFileName);
	  },
	  extraKeys: {
            "F11": function() {
			  var curPos = editor1.getCursor();
			  editor1.setCursor(0,0);
              var scroller = editor1.getScrollerElement();
              if (scroller.className.search(/\bCodeMirror-fullscreen\b/) === -1) {
                scroller.className += " CodeMirror-fullscreen";
                scroller.style.height = "100%";
                scroller.style.width = "100%";
                editor1.refresh();
				editor1.setCursor(curPos.line,curPos.ch);
              } else {
                scroller.className = scroller.className.replace(" CodeMirror-fullscreen", "");
                scroller.style.height = '';
                scroller.style.width = '';
                editor1.refresh();
				editor1.setCursor(curPos.line,curPos.ch);
              }
            },
            "Esc": function() {
			  var curPos = editor1.getCursor();
			  editor1.setCursor(0,0);
              var scroller = editor1.getScrollerElement();
              if (scroller.className.search(/\bCodeMirror-fullscreen\b/) !== -1) {
                scroller.className = scroller.className.replace(" CodeMirror-fullscreen", "");
                scroller.style.height = '';
                scroller.style.width = '';
                editor1.refresh();
				editor1.setCursor(curPos.line,curPos.ch);
              }
            }
        }
	});
	var hlLine1 = editor1.setLineClass(0, "activeline");
	editor1.setValue(" ");
});