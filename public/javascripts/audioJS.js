//DELETE - select the top oscillator, update screen (including 'selected')
//DELETE with note holding leaves note forever - have a delete which does that, and one that cleans up oscillators
//ADD - pull effects from selected, push freqScale to view
// make sure the first one is selected on startup


// WEB AUDIO STUFF ///////////////////////////////////////////////////////////////////////

//var context = new webkitAudioContext();

toggleOptions = ["log","lin"];
noteAssignmentOptions = ["low", "2low", "3low", "high","2hgh","3hgh","1st","2nd","3rd","4th","rand","rndA"];
oscTypeOptions = ["sin","sqr","saw","tri"];

screenToggleState = {
	attackType: 1,
	decayType: 1,
	portamentoType: 1,
	oscType: 0,
	noteAssignment: 0
};

function oscObject () {

	this.effectSettings = {
		attack: 0.05,
		attackType: 1,
		decay: 0.05,
		decayType: 1,
		portamento: 0.05,
		portamentoType: 1,
		oscType: 0,
		noteAssignment: 0
	},
	this.select = false,
	this.playing = 0,
	this.freqScale = 1,
	this.level = 50,
	this.identity = 1,
	this.oscillator = this.context.createOscillator(),
	this.gainNode = this.context.createGain ? this.context.createGain() : this.context.createGainNode(),
	this.envelope = this.context.createGain ? this.context.createGain() : this.context.createGainNode()
}

oscObject.prototype.context = new webkitAudioContext();

oscObject.prototype.initializeDefaultEffects = function(freqScale, identity) {
	
	this.freqScale = freqScale;	
	this.identity = identity; 


	this.oscillator.connect(this.gainNode);  
	this.gainNode.connect(this.envelope);
	this.envelope.connect(this.context.destination);

	this.gainNode.gain.value = 0.5;
	this.envelope.gain.value = 0;

	this.oscillator.start(0); 
}

oscObject.prototype.initialize = function(effectSettingsSelected, freqScaleSelected, identity) {
	
	this.effectSettings = effectSettingsSelected;
	this.freqScale = Math.round(freqScaleSelected) + 1;	
	this.identity = identity; 


	this.oscillator.connect(this.gainNode);  
	this.gainNode.connect(this.envelope);
	this.envelope.connect(this.context.destination);

	this.gainNode.gain.value = 0.5;
	this.envelope.gain.value = 0;

	this.oscillator.frequency.value = 200;
	this.oscillator.start(0); 
}



oscArray=[];
oscArray[0] = new oscObject();
oscArray[0].initializeDefaultEffects(1, 1);



returnNewID = function(){
	//run through oscArray and return lowest number not already an ID
	var IDnum = 1;
	while(oscArray.filter(function(arrayObj){ return arrayObj.identity == IDnum })[0]){
		IDnum++;
	}
	return IDnum;
}

updateSelection = function(selectionArray){
	//run through oscArray and update which oscillators are currently selected
	for(var i = 0; i < oscArray.length; i++){
    
        oscArray[i].select = false;
        
        for (identity in selectionArray){
   
            if (oscArray[i].identity == parseInt(selectionArray[identity].substring(1))){
                oscArray[i].select = true;
            }
        }
    
    }
}

deleteSelected = function(){
	//run through oscArray, see whos selected and delete
	for(var i = oscArray.length - 1; i >=0; i--){
    
        if (oscArray[i].select){
            oscArray.splice(i,1);
        }
    }
    
}

oscArrayUpdateGain = function(identity, gain){
	for (ind in oscArray){
		if (oscArray[ind].identity == identity){
			var multiplier = .8;
			oscArray[ind].gainNode.gain.exponentialRampToValueAtTime((Math.exp(multiplier*gain)-1)/(Math.exp(multiplier)-1)+.001, oscArray[ind].context.currentTime, oscArray[ind].context.currentTime+100);
                
		}
	}
}

oscArrayUpdateFreqScale = function(identity, freqScale){
	for (ind in oscArray){
		if (oscArray[ind].identity == identity){
			oscArray[ind].freqScale = freqScale;

			oscArray[ind].oscillator.frequency.cancelScheduledValues(0);
			oscArray[ind].oscillator.frequency.setTargetAtTime( oscArray[ind].freqScale*frequencyFromNoteNumber(oscArray[ind].playing), 0, 0.01);	

		}
	}
}


oscArrayUpdateEffectValue = function(effect, value){
//step through all elements, if selected update value
	for (index in oscArray){
		if (oscArray[index].select){
			oscArray[index].effectSettings[effect] = value;
		}
	}
}


updateEffectsView = function(selection){
	//get index of oscArray to pull update values from
	var index = oscArray.map(function(e) { return e.identity; }).indexOf(parseInt(selection.substring(1)));

	//update values to screen for knobs and toggles from oscArray[index].effectSettings

	//KNOBS
	//print to screen
	$(".knob#a").val(oscArray[index].effectSettings['attack']*100).trigger("change");
	$(".knob#d").val(oscArray[index].effectSettings['decay']*100).trigger("change");
	$(".knob#p").val(oscArray[index].effectSettings['portamento']*100).trigger("change");


	//TOGGLES
	//write to array
	screenToggleState.attackType=oscArray[index].effectSettings['attackType'];
	screenToggleState.decayType=oscArray[index].effectSettings['decayType'];
	screenToggleState.portamentoType=oscArray[index].effectSettings['portamentoType'];
	screenToggleState.oscType=oscArray[index].effectSettings['oscType'];
	screenToggleState.noteAssignment=oscArray[index].effectSettings['noteAssignment'];

	//print array to screen
	$('#at').html(toggleOptions[screenToggleState.attackType]);
	$('#dt').html(toggleOptions[screenToggleState.decayType]);
	$('#pt').html(toggleOptions[screenToggleState.portamentoType]);
	$('#signalType').html(oscTypeOptions[screenToggleState.oscType]);
	$('#noteBehavior').html(noteAssignmentOptions[screenToggleState.noteAssignment]);
}



// KNOB STUFF ///////////////////////////////////////////////////////////////////////

//LOG KNOB, 0-1
// value from actual knob, k: range 0 to <max_knob>
// value with 'depth' value, n: log(n/<max_knob>*k + 1)/log(n+1)

//EXP KNOB, 0-1
// value from actual knob, k: range 0 to <max_knob>
// value with 'depth' value, n: (exp(n/<max_knob>*k) - 1)/(exp(n)-1)



newOsc = function(){
	var num = returnNewID();
	console.log('create new oscillator, #' + num);

	//add div
	var htmlTag = '<div id="s' + num + '" class="selectable"> <span class="label">#' + num + '</span><input name="value" class="spinner"><div class="sliderBox"><input type="range" min="0" max="100" data-rangeslider></div></div>';
	$(htmlTag).insertBefore("#modSelector");
	
	//style div
	initializeSliders();
	initializeSpinners();
	intitializeSelectable();
	
	//add oscillator in oscArray
	var osc = new oscObject();
	osc.initializeDefaultEffects(num, num);
	oscArray.push(osc);

	//update screen spinner value
	$("#s" + num ).find(" .spinner ").val(num);

}

delSelected = function(){
	//remove oscArray object
	deleteSelected();
	
	//remove div
	console.log("delete " + $(".ui-selected").parent().attr("id"));	      
	$(".ui-selected").parent().remove();	

	SelectFirstOsc();
}

SelectFirstOsc = function(){
	var selectedRows=[];
	var element = $("#s" + oscArray[0]["identity"] + " .label");

    element.addClass("ui-selected");
    element.parent().css("background-color","#FFE1AD");		
   	selectedRows.push(element.html());

	//write selected to screen
	$( '#outputSelect' ).html('Selected channel(s): ' + selectedRows.toString());
	
	//write selected to oscArray
	updateSelection(selectedRows);

	console.log("DISABLED"); //disable selectable feature so things don't go crazy if you use sliders
	$( "#selector" ).selectable( "option", "disabled", "true" );
}

initializeSliders = function(){

	$("input[type='range']").each(function (e) {

		$(this).rangeslider({
			polyfill:false,
			rangeClass:'rangeslider',
			fillClass:'rangeslider__fill',
			handleClass:'rangeslider__handle',

			onSlide:function( pos, val){
				//write to console
				console.log('slider:' + $(event.target).closest(".selectable").attr("id") + ' val:' + val);
				
				//update oscArray Gain
				var updateID = $(event.target).closest(".selectable").attr("id");

				if(updateID){
					//oscArray Method	
					oscArrayUpdateGain(updateID.substring(1), val/100);
				}
			}
		});

	});
};


initializeSpinners = function(){
	$( ".spinner" ).each(function (e) {
		
		$(this).spinner({ step:0.01,

			spin: function( event, ui ) {
				//write to console
				console.log('spinner:' + $(event.target).closest(".selectable").attr("id") + ' val:' + ui.value);
			
				//update oscArray FreqScale
				var updateID = $(event.target).closest(".selectable").attr("id");

				if(updateID){
					//oscArray Method	
					oscArrayUpdateFreqScale(updateID.substring(1), ui.value);
				}

			}
		})
	}); //create spinner class
};


intitializeSelectable = function(){
	
	$( "#selector" ).selectable({ filter: "span", disabled: "true", //only label part is 'selectable'

		selected: function( event, ui ) {
			
			var selectedRows=[];

			//update selectedRows variable, update screen background color
			$( ".ui-selected", this ).each(function() {
				$(this).parent().css("background-color","#FFE1AD");
				selectedRows.push($(this).html());
			});	

			//write selected to screen
			$( '#outputSelect' ).html('Selected channel(s): ' + selectedRows.toString());
			
			//write selected to oscArray
			updateSelection(selectedRows);

			//update knobs
			updateEffectsView(selectedRows[0]);

			console.log("DISABLED"); //disable selectable feature so things don't go crazy if you use sliders
			$( "#selector" ).selectable( "option", "disabled", "true" );	
		},
	 
		unselected: function( event, ui ) {

			//change background color back for deselected elements 
			$( ".selectable .label", this ).not(".ui-selected").each(function() {
				$(this).parent().css("background-color","#FFB433");
			});
		}
	});

	$(".selectable .label").mousedown(function(){
		console.log("ENABLED"); //only enable selectable feature when clicking on labels, so things work w/sliders
    	$( "#selector" ).selectable( "option", "disabled", false );
	});

};

initializeKnobs = function(){

    $(".knob").each(function (e) {
		$(this).knob({


            draw : function () {
               
                console.log(event.target.id + ' ' + this.cv);

                if ($(event.target).parents(".effect").attr("id") == 'attack'){
                	oscArrayUpdateEffectValue("attack", this.cv/100);

                } else if ($(event.target).parents(".effect").attr("id") == 'decay'){
                	oscArrayUpdateEffectValue("decay", this.cv/100);
                	
                } else if ($(event.target).parents(".effect").attr("id") == 'portamento'){
                	oscArrayUpdateEffectValue("portamento", this.cv/100);
                	
                }

                if(this.$.data('skin') == 'tron') {
                    this.cursorExt = 0.3;
                    var a = this.arc(this.cv)  // Arc
                        , pa                   // Previous arc
                        , r = 1;
                    this.g.lineWidth = this.lineWidth;
                    if (this.o.displayPrevious) {
                        pa = this.arc(this.v);
                        this.g.beginPath();
                        this.g.strokeStyle = this.pColor;
                        this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, pa.s, pa.e, pa.d);
                        this.g.stroke();
                    }
                    this.g.beginPath();
                    this.g.strokeStyle = r ? this.o.fgColor : this.fgColor ;
                    this.g.arc(this.xy, this.xy, this.radius - this.lineWidth, a.s, a.e, a.d);
                    this.g.stroke();
                    this.g.lineWidth = 2;
                    this.g.beginPath();
                    this.g.strokeStyle = this.o.fgColor;
                    this.g.arc( this.xy, this.xy, this.radius - this.lineWidth + 1 + this.lineWidth * 2 / 3, 0, 2 * Math.PI, false);
                    this.g.stroke();
                    return false;
                }
            }
        });
	});
};


incrementScreenToggle = function(effect){
//update screenToggleState variable and screen, return new val
	switch(effect){
		case "attackType":
			screenToggleState.attackType = 1-screenToggleState.attackType;
			$('#at').html(toggleOptions[screenToggleState.attackType]);
			return screenToggleState.attackType;

		case "decayType":
			screenToggleState.decayType = 1-screenToggleState.decayType;
			$('#dt').html(toggleOptions[screenToggleState.decayType]);
			return screenToggleState.decayType;

		case "portamentoType":
			screenToggleState.portamentoType = 1-screenToggleState.portamentoType;
			$('#pt').html(toggleOptions[screenToggleState.portamentoType]);
			return screenToggleState.portamentoType;

		case "oscType":
			screenToggleState.oscType = (++screenToggleState.oscType == oscTypeOptions.length) ? 0: screenToggleState.oscType;
			$('#signalType').html(oscTypeOptions[screenToggleState.oscType]);
			return screenToggleState.oscType;

		case "noteAssignment":
			screenToggleState.noteAssignment = (++screenToggleState.noteAssignment == noteAssignmentOptions.length) ? 0: screenToggleState.noteAssignment;
			$('#noteBehavior').html(noteAssignmentOptions[screenToggleState.noteAssignment]);
			return screenToggleState.noteAssignment;

		default:
			console.log("error");
	};
}

initializeToggles = function(){

	$( ".toggle" ).click(function(){
		
		switch($(event.target).attr("id")){
			case "at":
        		console.log("attack toggle");
        		var val = incrementScreenToggle("attackType");
        		oscArrayUpdateEffectValue("attackType",val);

        		break;
       		case "dt":
        		console.log("decay toggle");
        		var val = incrementScreenToggle("decayType");
        		oscArrayUpdateEffectValue("decayType",val);

        		break;
    		case "pt":
        		console.log("portamento toggle");
        		var val = incrementScreenToggle("portamentoType");
        		oscArrayUpdateEffectValue("portamentoType",val);

        		console.log(oscArray);

        		break;
    		case "signalType":
        		console.log("signal toggle");
        		var val = incrementScreenToggle("oscType");
        		oscArrayUpdateEffectValue("oscType",val);

        		break;
        	case "noteBehavior":
        		console.log("note toggle");
				var val = incrementScreenToggle("noteAssignment");
        		oscArrayUpdateEffectValue("noteAssignment",val);

        		break;
			case "add":
        		console.log("add");
        		newOsc();

        		break;
			case "del":
        		console.log("del");
        		delSelected();

        		break;
    		default:
        		console.log('error');
		}
	});


}



//////////DOCUMENT READY FUNCTION//////////////
$(function($) {

	initializeSliders();
	initializeSpinners();
	intitializeSelectable();
	initializeKnobs();
	initializeToggles();

	//write spinner value for first div
	$( ".spinner" ).spinner().val(1);
	SelectFirstOsc();



	console.log("MIDI Test Initiated...");
	window.AudioContext=window.AudioContext||window.webkitAudioContext;
	context = new AudioContext();
	if (navigator.requestMIDIAccess)
		navigator.requestMIDIAccess().then( onMIDIInit, onMIDIReject );
	else
		alert("No browser MIDI support, please check out http://jazz-soft.net/ and get that browser fixed!")
		console.log("No browser MIDI support, please check out http://jazz-soft.net/ and get that browser fixed!")

});







//MIDI HANDLING STUFF /////////////////////////////////////////////////////////////////////////

var midiAccess;
var attack=0.05;			// attack speed
var release=0.05;		// release speed
var portamento=0.05;
var activeNotes = [];

function onMIDIInit(midi) {

			midiAccess = midi;
			if ((typeof(midiAccess.inputs) == "function")) { 
				
				var inputs=midiAccess.inputs();
				
				if (inputs.length === 0){
					alert("No MIDI input devices detected.")
					console.log('No MIDI input devices detected.');
				}else { // Hook the message handler for all MIDI inputs
				
					for (var i=0;i<inputs.length;i++)
						inputs[i].onmidimessage = MIDIMessageEventHandler;
					console.log('MIDI successful.');
				}
			} else {  // new MIDIMap implementation
				var haveAtLeastOneDevice=false;
			    var inputs=midiAccess.inputs.values();

			    for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
			    	input.value.onmidimessage = MIDIMessageEventHandler;
			    	haveAtLeastOneDevice = true;
			    	console.log('MIDI successful.');
			    }

			    if (!haveAtLeastOneDevice)
					alert("No MIDI input devices detected.");
					console.log("No MIDI input devices detected.");
			}
		}

function onMIDIReject(err) {
			alert("MIDI access was rejected, despite the browser supporting it.");
			console.log("MIDI access was rejected, despite the browser supporting it.");
			
		}

function MIDIMessageEventHandler(event) {

			switch (event.data[0] & 0xf0) {
				case 0x90:
					if (event.data[2]!=0) {  // note-on
						noteOn(event.data[1], event.data[2]);
						return;
					}
				case 0x80: //note off
					noteOff(event.data[1]);
					return;
			}
		}

function frequencyFromNoteNumber(note) {
			return 440 * Math.pow(2,(note-69)/12);
		}

function noteOn(noteNumber, velocity) {
			activeNotes.push(noteNumber);
			
			for (var i=0; i<oscArray.length; i++){
				oscArray[i].oscillator.frequency.cancelScheduledValues(0);
				oscArray[i].oscillator.frequency.setTargetAtTime( oscArray[i].freqScale*frequencyFromNoteNumber(noteNumber), 0, oscArray[i].effectSettings.portamento);
				oscArray[i].envelope.gain.cancelScheduledValues(0);
				oscArray[i].envelope.gain.setTargetAtTime(1.0, 0, oscArray[i].effectSettings.attack);
				oscArray[i].playing = noteNumber;
			}

			$( '#outputNotes' ).html('MIDI notes playing: ' + activeNotes.toString());	
			console.log('active notes:' + activeNotes);
		}

function noteOff(noteNumber) {
			var position = activeNotes.indexOf(noteNumber);
			if (position!=-1) {
				activeNotes.splice(position,1);
			}
			if (activeNotes.length==0) {	// shut off the envelope
				for (var i=0; i<oscArray.length; i++){
					oscArray[i].envelope.gain.cancelScheduledValues(0);
					oscArray[i].envelope.gain.setTargetAtTime(0.0, 0, oscArray[i].effectSettings.decay );
					oscArray[i].playing = 0;
				}
			} else {
				for (var i=0; i<oscArray.length; i++){
					oscArray[i].oscillator.frequency.cancelScheduledValues(0);
					oscArray[i].oscillator.frequency.setTargetAtTime( oscArray[i].freqScale*frequencyFromNoteNumber(activeNotes[activeNotes.length-1]), 0, oscArray[i].effectSettings.portamento);
					oscArray[i].playing = activeNotes[activeNotes.length-1];
				}
			}

			$( '#outputNotes' ).html('MIDI notes playing: ' + activeNotes.toString());
			console.log('active notes:' + activeNotes);
		}


