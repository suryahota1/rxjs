import { Subject } from "./Subject";

class AsyncSubject<T> extends Subject<T> {

    value: T;

    constructor () {
        super();
    }

    next(value: T): void {
        this.value = value;
    }

    complete(): void {
        if ( this.value ) {
            super.next(this.value);
        }
        super.complete();
    }
}