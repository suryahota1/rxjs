import { Subscriber, TearDownLogic } from "./Observable";
import { Subject } from "./Subject";

class BehaviourSubject<T> extends Subject<T> {

    private _value: T;

    protected _subscribe(subsciber: Subscriber<any>): TearDownLogic {
        if ( this.errorRef ) {
            throw this.errorRef;
        }
        if ( this.isComplete ) {
            subsciber.complete();
        }
        if ( this._value ) {
            subsciber.next(this._value);
        }
        return super._subscribe(subsciber);
    }

    next ( value: T ) {
        this._value = value;
        super.next(value);
    }
}