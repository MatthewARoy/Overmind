import {CombatIntel} from '../../intel/CombatIntel';
import {BunkerDefenseOverlord} from '../../overlords/defense/bunkerDefense';
import {MeleeDefenseOverlord} from '../../overlords/defense/meleeDefense';
import {RangedDefenseOverlord} from '../../overlords/defense/rangedDefense';
import {profile} from '../../profiler/decorator';

import {ColonyStage} from '../../Colony';
import {Directive} from '../Directive';
import {NotifierPriority} from '../Notifier';
import {DistractionOverlord} from "../../overlords/defense/distraction";
import {DirectivePairDestroy} from "../offense/pairDestroy";

interface DirectiveInvasionDefenseMemory extends FlagMemory {
	persistent?: boolean;
	created: number;
	safeSince: number;
}

/**
 * Defend an owned room against an incoming player invasion
 */
@profile
export class DirectiveInvasionDefense extends Directive {

	static directiveName = 'invasionDefense';
	static color = COLOR_BLUE;
	static secondaryColor = COLOR_PURPLE;

	memory: DirectiveInvasionDefenseMemory;
	room: Room | undefined;

	private relocateFrequency: number;
	safeEndTime: 500;

	constructor(flag: Flag) {
		super(flag, colony => colony.level >= 1 && colony.spawns.length > 0);
	}

	spawnMoarOverlords() {
		if (!this.room) {
			return;
		}
		const expectedDamage = CombatIntel.maxDamageByCreeps(this.room.dangerousPlayerHostiles);
		const expectedHealing = CombatIntel.maxHealingByCreeps(this.room.dangerousPlayerHostiles);
		const useBoosts = (expectedDamage > ATTACK_POWER * 50) || (expectedHealing > RANGED_ATTACK_POWER * 100)
						&& !!this.colony.terminal
						&& !!this.colony.evolutionChamber;
		const percentWalls = _.filter(this.room.barriers, s => s.structureType == STRUCTURE_WALL).length /
							 this.room.barriers.length;
		const meleeHostiles = _.filter(this.room.hostiles, hostile => hostile.getActiveBodyparts(ATTACK) > 0 ||
																	  hostile.getActiveBodyparts(WORK) > 0);
		const rangedHostiles = _.filter(this.room.hostiles, hostile => hostile.getActiveBodyparts(RANGED_ATTACK) > 0);
		if (meleeHostiles.length > 0 && expectedDamage > 40*ATTACK_POWER || rangedHostiles.length >= 3) {
			this.overlords.bunkerDefense = new BunkerDefenseOverlord(this, true);
			this.overlords.distraction = new DistractionOverlord(this);
		}
		if (this.colony.stage > ColonyStage.Larva) {
			this.overlords.rangedDefense = new RangedDefenseOverlord(this, useBoosts);
			//DirectivePairDestroy.createIfNotPresent(this.pos, 'room');
		} else {
			this.overlords.meleeDefense = new MeleeDefenseOverlord(this, false);
		}
	}

	init(): void {
		const numHostiles: string = this.room ? this.room.hostiles.length.toString() : '???';
		this.alert(`Invasion (hostiles: ${numHostiles}) ${Game.time - this.memory.safeSince}`, NotifierPriority.Critical);
	}

	recordBaddies () {
		if (!this.room) {
			return;
		}
		let mem = Memory.playerCreepTracker;
		let hostiles = this.room.hostiles;
		hostiles.forEach(creep => {
			if (!mem[creep.owner.username]) {
				mem[creep.owner.username] = {
					creeps: {},
					types: {},
					parts: {},
					boosts: {},
				};
			}
			let playerMem = mem[creep.owner.username];
			if (!playerMem.creeps[creep.name]) {
				playerMem.creeps[creep.name] = Game.time;
				const creepType = creep.name.substr(0, creep.name.indexOf(" "));
				if (creepType == creep.name) {
					// memory protection if they don't split name
					return;
				}
				playerMem.types[creepType] = (playerMem.types[creepType]+1) || 1;
				for (const bodyPart of creep.body) {
					playerMem.parts[bodyPart.type] = (playerMem.parts[bodyPart.type])+1 || 1;
					if (bodyPart.boost) {
						playerMem.boosts[bodyPart.boost] = (playerMem.boosts[bodyPart.boost])+1 || 1;
					}
				}
			}
		});
	}

	printPlayerExpenditure() {
		let t3Count = 0;
		let energyCount = 0;
		let mem = Memory.playerCreepTracker['inakrin'];
		for (let boostid in mem.boosts) {
			let boost = mem.boosts[boostid];
			console.log(`${boostid} : ${boost*30}`);
			t3Count+=boost*30;
			energyCount+=20;
		}
		for (let partType in mem.parts) {
			let partCount = mem.parts[partType];
			const cost = BODYPART_COST[(partType as BodyPartConstant)];
			console.log(`${partType} : ${cost * partCount}`);
			energyCount+=cost * partCount;
		}

		console.log(`Total T3 Cost: ${t3Count}`);
		console.log(`Total Energy Cost: ${energyCount}`);
	}

	cleanUpPlayerMem() {
		let mem = Memory.playerCreepTracker;
		for (let player of _.keys(mem)) {
			let tracker = mem[player];
			for (let creep of _.keys(tracker.creeps)) {
				if (tracker.creeps[creep] + 1500 < Game.time) {
					delete tracker.creeps[creep];
				}
			}
		}
	}

	run(): void {
		if (!this.room || this.room.hostiles.length > 0) {
			this.memory.safeSince = Game.time;
			this.recordBaddies();
		}
		//this.printPlayerExpenditure();

		if (Game.time % 5000 == 0) {
			// clean up, ya this shit
			this.cleanUpPlayerMem();
		}
		//if (this.room && (this.room!.name == 'W13N45' || this.room!.name == 'W18N49')) {
		//	CombatIntel.computeCreepDamagePotentialMatrix(this.room, this.room.dangerousPlayerHostiles);
		//}
		// If there are no hostiles left in the room and everyone's healed, then remove the flag
		if (this.room && this.room.hostiles.length == 0 &&
			(Game.time - this.memory.safeSince) > this.safeEndTime) {
			if (_.filter(this.room.creeps, creep => creep.hits < creep.hitsMax).length == 0) {
				this.remove();
			}
		} else if ((Game.time - this.memory.safeSince) > 3000) {
			this.remove();
		}
	}

}
