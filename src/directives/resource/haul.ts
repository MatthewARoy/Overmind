import {EnergyStructure, isEnergyStructure, isStoreStructure, StoreStructure} from '../../declarations/typeGuards';
import {HaulingOverlord} from '../../overlords/situational/hauler';
import {profile} from '../../profiler/decorator';
import {Directive} from '../Directive';
import {hasMinerals} from "../../utilities/utils";


interface DirectiveHaulMemory extends FlagMemory {
	totalResources?: number;
	lootRoom?: boolean;
}


/**
 * Hauling directive: spawns hauler creeps to move large amounts of resourecs from a location (e.g. draining a storage)
 */
@profile
export class DirectiveHaul extends Directive {

	static directiveName = 'haul';
	static color = COLOR_YELLOW;
	static secondaryColor = COLOR_BLUE;

	private _store: StoreDefinition;
	private _drops: { [resourceType: string]: Resource[] };

	memory: DirectiveHaulMemory;

	constructor(flag: Flag) {
		super(flag);
	}

	spawnMoarOverlords() {
		this.overlords.haul = new HaulingOverlord(this);
	}

	get targetedBy(): string[] {
		return Overmind.cache.targets[this.ref];
	}

	get drops(): { [resourceType: string]: Resource[] } {
		if (!this.pos.isVisible) {
			return {};
		}
		if (this.memory.lootRoom && this.room) {
			const drops = this.room.find(FIND_DROPPED_RESOURCES);
			this._drops = _.groupBy(drops, drop => drop.resourceType);
		} else if (!this._drops) {
			const drops = (this.pos.lookFor(LOOK_RESOURCES) || []) as Resource[];
			this._drops = _.groupBy(drops, drop => drop.resourceType);
		}
		return this._drops;
	}

	findAllExposedGoodies(): (StoreStructure | EnergyStructure)[]{
		if (!this.room) {
			return [];
		}
		const exposedGoodies = this.room.find(FIND_STRUCTURES).filter(structure =>
			(isStoreStructure(structure) || isEnergyStructure(structure)) && structure.pos.lookForStructure(STRUCTURE_RAMPART)
			== undefined) as (StoreStructure | EnergyStructure)[];
		return  exposedGoodies.filter(structure => {
			if (structure.structureType == STRUCTURE_LAB) {
				let struct = structure as StructureLab;
				if (struct.energy > 0 || struct.mineralAmount > 0) {
					return true;
				}
			} else if (isEnergyStructure(structure)) {
				return structure.energy > 0;
			} else if (isStoreStructure(structure)) {
				return _.sum(this.store) > 0;
			}
		});
	}

	get hasDrops(): boolean {
		return _.keys(this.drops).length > 0;
	}

	get storeStructure(): StructureStorage | StructureTerminal | StructureNuker | undefined {
		if (this.pos.isVisible) {
			return <StructureStorage>this.pos.lookForStructure(STRUCTURE_STORAGE) ||
				   <StructureTerminal>this.pos.lookForStructure(STRUCTURE_TERMINAL) ||
				   <StructureNuker>this.pos.lookForStructure(STRUCTURE_NUKER);
		}
		return undefined;
	}

	get store(): StoreDefinition {
		if (!this._store) {
			// Merge the "storage" of drops with the store of structure
			let store: { [resourceType: string]: number } = {};
			if (this.memory.lootRoom) {
				let targets = this.findAllExposedGoodies();
				if (targets.length > 0) {
					const target = targets[0];
					if (isStoreStructure(target)) {
						store = target.store;
					} else {
						store = {energy: target.energy};
					}
				}
			} else if (this.storeStructure) {
				if (isStoreStructure(this.storeStructure)) {
					store = this.storeStructure.store;
				} else {
					store = {energy: this.storeStructure.energy};
				}
			} else {
				store = {energy: 0};
			}
			// Merge with drops
			for (const resourceType of _.keys(this.drops)) {
				const totalResourceAmount = _.sum(this.drops[resourceType], drop => drop.amount);
				if (store[resourceType]) {
					store[resourceType] += totalResourceAmount;
				} else {
					store[resourceType] = totalResourceAmount;
				}
			}
			this._store = store as StoreDefinition;
		}
		return this._store;
	}

	/**
	 * Total amount of resources remaining to be transported; cached into memory in case room loses visibility
	 */
	get totalResources(): number {
		if (this.pos.isVisible) {
			this.memory.totalResources = _.sum(this.store); // update total amount remaining
		} else {
			if (this.memory.totalResources == undefined) {
				return 1000; // pick some non-zero number so that haulers will spawn
			}
		}
		return this.memory.totalResources;
	}

	init(): void {
		this.alert(`Haul directive active`);
	}

	run(): void {
		if (_.sum(this.store) == 0 && this.pos.isVisible) {
			this.remove();
		}
	}

}

