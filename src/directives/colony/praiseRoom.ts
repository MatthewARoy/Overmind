import {Colony} from '../../Colony';
import {SpawnGroup} from '../../logistics/SpawnGroup';
import {ClaimingOverlord} from '../../overlords/colonization/claimer';
import {PraisingOverlord} from '../../overlords/colonization/praiser';
import {profile} from '../../profiler/decorator';
import {Directive} from '../Directive';


/**
 * Claims a new room and incubates it from the nearest (or specified) colony
 */
@profile
export class DirectivePraiseRoom extends Directive {

	static directiveName = 'incubate';
	static color = COLOR_PURPLE;
	static secondaryColor = COLOR_GREEN;

	incubatee: Colony | undefined;

	constructor(flag: Flag) {
		super(flag, colony => colony.level >= 7);
		// Register incubation status
		this.incubatee = this.room ? Overmind.colonies[Overmind.colonyMap[this.room.name]] : undefined;
		if (this.incubatee) {
			this.incubatee.isIncubating = true;
			this.incubatee.spawnGroup = new SpawnGroup(this.incubatee);
		}
	}

	spawnMoarOverlords() {
		if (!this.incubatee) { // colony isn't claimed yet
			this.overlords.claim = new ClaimingOverlord(this);
			this.overlords.praise = new PraisingOverlord(this);
		}
	}

	init() {

	}

	run() {
		if (this.incubatee) {
			if (this.incubatee.level >= 8 && this.incubatee.storage && this.incubatee.terminal ) {
				this.remove();
			}
		}
	}
}
