
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
function powerRoutine(roomName: string){
    
    let powerCreep = Game.powerCreeps[roomName];
    let controller = Game.rooms[roomName].controller;
    let terminal = Game.rooms[roomName].terminal;
    let storage = Game.rooms[roomName].storage;
    let powerSpawn = Game.rooms[roomName].powerSpawn;
	
    if( !powerCreep || !Game.rooms[roomName] || !controller || !terminal || !powerSpawn || !storage) {
      return;
    }
    if(!powerCreep.room){
      powerCreep.spawn(powerSpawn);
      return;
	}
	
	powerCreep.renew(powerSpawn);
    
    if(!controller.isPowerEnabled){
      powerCreep.pos.isNearTo(controller)?
      powerCreep.enableRoom(controller):powerCreep.moveTo(controller);
      return;
    }

    powerCreep.usePower(PWR_GENERATE_OPS);
    
    if((_.sum(powerCreep.carry) > 0)){//== powerCreep.carryCapacity) || (_.sum(powerCreep.carry) > 0 && powerCreep.ticksToLive < 50) ){
      powerCreep.pos.isNearTo(storage)?
      powerCreep.transfer(storage, RESOURCE_OPS):powerCreep.moveTo(storage);    
      return;
    }
}
function zGeneral() {
	/*
	for(let roomName in Memory.colonies){
		let room = Game.rooms[roomName];
		let x = 0;
		_.forEach(Game.flags,flag => {
			if(flag.color == COLOR_YELLOW && flag.secondaryColor == COLOR_YELLOW && flag.memory.C == roomName){
				x++;
			}
		});
		console.log('+++++++++++' + roomName +'+++++++++++' + x);
	}
	*/
	/*
	for(let roomName in Memory.colonies){
		let room = Game.rooms[roomName];
		let mineral = room.mineral!.mineralType;
		console.log(roomName + ' ' + mineral);
	}
	*/
	/*
	let ops = 0;
	let power = 0;
	let energy = 0;
	for(let roomName in Memory.colonies){
		let room = Game.rooms[roomName];
		if(room && room.my && room.terminal) {
			ops = ops + (room.terminal.store.ops || 0);
			power = power + (room.terminal.store.power || 0);
			energy = energy + (room.terminal.store.energy || 0);
			if(room.storage) {
				energy = energy + (room.storage.store.energy || 0);
			}
		}
	}
	
	console.log('total ops = '+ ops);
	console.log('total power = '+ power);
	console.log('total energy = '+ energy);
	*/
	// note: return this.kite(nearbyHostiles); //KIMZ, change this to flee
	// replace with flee
	// disabled power processing

	// note: if(['W38N43','W37N43','W38N44'].indexOf(pos.roomName) == -1) {
	// blocked from reating outpost
	/* 
	_.forEach(Game.flags,flag => {
        let creep = Game.getObjectById(flag.name);
        if(creep){
            creep.moveTo(flag);
            creep.dismantle(_.first(flag.pos.lookFor(LOOK_STRUCTURES)));
        }
    });
	*/
	/*
	for(let roomName in Memory.colonies){
		let room = Game.rooms[roomName];
		if(room && room.my && room.powerSpawn && room.powerSpawn.power > 0) {
			room.powerSpawn.processPower();
		}
	}
	*/
	if(Game.time % 51 == 0){
		let or = Game.market.getAllOrders(order => order.resourceType == RESOURCE_POWER 
				&& order.type == ORDER_SELL && order.price < 0.3);
		for (let roomName in Memory.colonies) {
			let room = Game.rooms[roomName];
			if (room.terminal && room.terminal.cooldown == 0) {                    
				if (or.length > 0) {
					let r = Game.market.deal(or[0].id, 10000, room.name);
					if (r == 0) {
						let x = or.shift();
						console.log(room.name + " " + x!.amount + " " + (RESOURCE_POWER) + "@ " + x!.price);}}}};
	}
	/*
	if((Game.time + 3800) % 12500 == 0){
		let x = 0;
		_.forEach(Game.rooms, room => {
			if(
		  room.controller &&
		  room.controller.my &&
		  room.nuker &&
		  room.nuker.energy == 300000 &&
		room.nuker.cooldown == 0 &&
		  Game.map.getRoomLinearDistance(room.name, 'W28N57') <= 10 &&
			x == 0){
					room.nuker.launchNuke(new RoomPosition(25, 23, 'W28N57'));
					x++;
			} 
		});
	}
	*/
	if ((Game.time) % 111 == 0) { //
		let resources = [RESOURCE_CATALYST, RESOURCE_ZYNTHIUM, RESOURCE_LEMERGIUM, 
						 RESOURCE_KEANIUM, RESOURCE_UTRIUM, RESOURCE_OXYGEN, RESOURCE_HYDROGEN,RESOURCE_POWER];
		_.forEach(resources, m => {
			for(let roomName in Memory.colonies){
				let room = Game.rooms[roomName];
				if (room.terminal && (room.terminal.store[m] || 0) < 2000 && room.terminal.cooldown == 0) {
					let or = Game.market.getAllOrders(order => 
							 order.resourceType == m && order.type == ORDER_SELL && order.price < 0.3);
					if (or.length > 0) {
						let r = Game.market.deal(or[0].id, 2000 - (room.terminal.store[m] || 0), room.name);
						if (r == 0) {
							console.log(room.name + " " + (2000 - (room.terminal.store[m] || 0)) + 
							" " + (m) + "@ " + or[0].price);
						}
					}
				}
			};
		});
	}
	if(Game.time % 50 == 0){
    	let rooms = ['W32N47', 'W27N54', 'W29N52', 'W33N56', 'W35N59','W36N57',
                     'W35N53','W39N56',
                     'W37N55','W34N53','W34N47'
        ]; 
        rooms.forEach(powerRoutine);
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
	Overmind.postRun();		
	zGeneral();										// Error catching is run at end of every tick										// Error catching is run at end of every tick
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



