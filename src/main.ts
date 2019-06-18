
//
// ___________________________________________________________
//
//  _____  _    _ _______  ______ _______ _____ __   _ ______
// |     |  \  /  |______ |_____/ |  |  |   |   | \  | |     \
// |_____|   \/   |______ |    \_ |  |  | __|__ |  \_| |_____/
//
// _______________________ Screeps AI ________________________
//
//
// Overmind repository: github.com/bencbartlett/overmind
//


// @formatter:off
/* tslint:disable:ordered-imports */

'use strict';
// Import ALL the things! ==============================================================================================
import './assimilation/initializer'; // This must always be imported before anything else
import './console/globals'; // Global functions accessible from CLI
import './prototypes/Creep'; // Creep prototypes
import './prototypes/RoomObject'; // RoomObject and targeting prototypes
import './prototypes/RoomPosition'; // RoomPosition prototypes
import './prototypes/RoomVisual'; // Prototypes used in Visualizer class
import './prototypes/Room'; // Non-structure room prototypes
import './prototypes/RoomStructures'; // IVM-cached structure prototypes
import './prototypes/Structures'; // Prototypes for accessed structures
import './prototypes/Miscellaneous'; // Everything else
import './tasks/initializer'; // This line is necessary to ensure proper compilation ordering...
import './zerg/CombatZerg'; // ...so is this one... rollup is dumb about generating reference errors
import {MUON, MY_USERNAME, RL_TRAINING_MODE, USE_PROFILER} from './~settings';
import {sandbox} from './sandbox';
import {Mem} from './memory/Memory';
import {OvermindConsole} from './console/Console';
import {Stats} from './stats/stats';
import profiler from './profiler/screeps-profiler';
import _Overmind from './Overmind_obfuscated'; // this should be './Overmind_obfuscated' unless you are me
import {VersionMigration} from './versionMigration/migrator';
import {RemoteDebugger} from './debug/remoteDebugger';
import {ActionParser} from './reinforcementLearning/actionParser';
// =====================================================================================================================
function zGeneral(){
    try{
        let p1 = new RoomPosition(8,11,"W33N56");
        let p2 = new RoomPosition(9,10,"W33N56");
        let c1 = p1.lookFor(LOOK_CONSTRUCTION_SITES);
        let c2 = p2.lookFor(LOOK_CONSTRUCTION_SITES);
        if(c1.length > 0)
            c1[0].remove();
        if(c2.length > 0)
            c2[0].remove();
	}catch(ERR){}

	if((Game.time) % 111 == 0){//
		let resources = [RESOURCE_CATALYST,	RESOURCE_ZYNTHIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_UTRIUM, RESOURCE_OXYGEN, RESOURCE_HYDROGEN];
		_.forEach(resources,m => {
	    	_.forEach(Game.rooms, room => {
	    		if(room.terminal && (room.terminal.store[m] || 0 ) < 2000 && room.terminal.cooldown == 0){
	    			let or = Game.market.getAllOrders(order => order.resourceType == m && order.type == ORDER_SELL && order.price < 0.3);
	    			if(or.length > 0){
	    				let r = Game.market.deal(or[0].id,2000 - (room.terminal.store[m] || 0 ),room.name);
	    				if ( r == 0 ){
	    					console.log(room.name + " " + (2000 - (room.terminal.store[m] || 0 )) + " " + (m) + "@ " +or[0].price);
	    				}
	    			}
	    		}
	    	});
		});
    }
}
// Main loop
function main(): void {
	// Memory operations: load and clean memory, suspend operation as needed -------------------------------------------
	Mem.load();														// Load previous parsed memory if present
	if (!Mem.shouldRun()) return;									// Suspend operation if necessary
	Mem.clean();													// Clean memory contents

	// Instantiation operations: build or refresh the game state -------------------------------------------------------
	if (!Overmind || Overmind.shouldBuild || Game.time >= Overmind.expiration) {
		delete global.Overmind;										// Explicitly delete the old Overmind object
		Mem.garbageCollect(true);								// Run quick garbage collection
		global.Overmind = new _Overmind();							// Instantiate the Overmind object
		Overmind.build();											// Build phase: instantiate all game components
	} else {
		Overmind.refresh();											// Refresh phase: update the Overmind state
	}

	// Tick loop cycle: initialize and run each component --------------------------------------------------------------
	Overmind.init();												// Init phase: spawning and energy requests
	Overmind.run();													// Run phase: execute state-changing actions
	Overmind.visuals(); 											// Draw visuals
	Stats.run(); 													// Record statistics

	// Post-run code: handle sandbox code and error catching -----------------------------------------------------------
	sandbox();														// Sandbox: run any testing code
	global.remoteDebugger.run();									// Run remote debugger code if enabled
<<<<<<< HEAD
	Overmind.postRun();		
	zGeneral();										// Error catching is run at end of every tick

=======
	Overmind.postRun();												// Error catching is run at end of every tick
>>>>>>> master
}

// Main loop if RL mode is enabled (~settings.ts)
function main_RL(): void {
	Mem.clean();

	delete global.Overmind;
	global.Overmind = new _Overmind();

	ActionParser.run();
}

// This gets run on each global reset
function onGlobalReset(): void {
	if (USE_PROFILER) profiler.enable();
	Mem.format();
	OvermindConsole.init();
	VersionMigration.run();
	Memory.stats.persistent.lastGlobalReset = Game.time;
	OvermindConsole.printUpdateMessage();
	// Update the master ledger of valid checksums
	if (MY_USERNAME == MUON) {
		Assimilator.updateValidChecksumLedger();
	}
	// Make a new Overmind object
	global.Overmind = new _Overmind();
	// Make a remote debugger
	global.remoteDebugger = new RemoteDebugger();
}


// Global reset function if RL mode is enabled
function onGlobalReset_RL(): void {
	Mem.format();
}

// Decide which loop to export as the script loop
let _loop: () => void;
if (RL_TRAINING_MODE) {
	// Use stripped version for training reinforcment learning model
	_loop = main_RL;
} else {
	if (USE_PROFILER) {
		// Wrap the main loop in the profiler
		_loop = () => profiler.wrap(main);
	} else {
		// Use the default main loop
		_loop = main;
	}
}

export const loop = _loop;

// Run the appropriate global reset function
if (RL_TRAINING_MODE) {
	OvermindConsole.printTrainingMessage();
	onGlobalReset_RL();
} else {
	// Register these functions for checksum computations with the Assimilator
	Assimilator.validate(main);
	Assimilator.validate(loop);
	// Run the global reset code
	onGlobalReset();
}



