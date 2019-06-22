import {ClaimingOverlord} from '../../overlords/colonization/claimer';
import {PraisingOverlord} from '../../overlords/colonization/praiser';
import {profile} from '../../profiler/decorator';
import {Directive} from '../Directive';


/**
 * Praise a new room
 */
@profile
export class DirectivePraiseRoom extends Directive {

	static directiveName = 'incubate';
	static color = COLOR_PURPLE;
	static secondaryColor = COLOR_GREEN;
	static priority = 2000;

	constructor(flag: Flag) {
		super(flag, colony => colony.level >= 7);
	}

	spawnMoarOverlords() {
		if (this.room && !this.room.my) { // colony isn't claimed yet
			this.overlords.claim = new ClaimingOverlord(this);
		} else {
            this.overlords.praise = new PraisingOverlord(this,2000);
        }
	}

	init() {
		this.alert(`PraiseRoom active - by colony ${this.colony.name}`);
	}

	run() {
		
			if (this.room && this.room.controller!.level >= 8 && this.room.storage && this.room.terminal ) {
				this.remove();
			}
		}
}

