import {log} from '../../console/log';
import {ModularDismantlerOverlord} from '../../overlords/offense/modularDismantler';
import {profile} from '../../profiler/decorator';
import {Visualizer} from '../../visuals/Visualizer';
import {Directive} from '../Directive';

/**
 * Spawns a pair of attacker/healer creeps to siege a room
 */
@profile
export class DirectiveModularDismantler extends Directive {

	static directiveName = 'modularDismantler';
	static color = COLOR_RED;
	static secondaryColor = COLOR_GREEN;

	overlords: {
		dismantler: ModularDismantlerOverlord;
	};

	constructor(flag: Flag) {
		super(flag);
	}

	spawnMoarOverlords() {
		this.overlords.dismantler = new ModularDismantlerOverlord(this);
	}

	init(): void {
		this.alert(`modular dismantler directive active`);
	}

	run(): void {
		// If there are no hostiles left in the room then remove the flag and associated healpoint
		if (this.room && this.room.hostiles.length == 0 && this.room.hostileStructures.length == 0) {
			log.notify(`Modular dismantler mission at ${this.pos.roomName} completed successfully.`);
			this.remove();
		}
	}

	visuals(): void {
		Visualizer.marker(this.pos, {color: 'red'});
	}
}
