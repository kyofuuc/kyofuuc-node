
export class PromiscuousPromise {

    private _resolutionCounter = 0;
    private _parameters: any[] = [];
    private _asyncFunction: Function;
    private _resolutionMap: { [index:number]: boolean } = {};

    constructor(asyncFunction: Function, ...parameters: any[]) {
        this._parameters = parameters;
        this._asyncFunction = asyncFunction;
    }

    get<T>(__unique__?: boolean): Promise<T> & { get: () => Promise<T> & { get: () => Promise<T> & { get: () => Promise<T> & { get: () => Promise<T> & { get: () => Promise<T> } } } } } {
        const promiseInstanceCounter = ++this._resolutionCounter;
        this._resolutionMap[promiseInstanceCounter] = true;
        const laPromise = this._asyncFunction(...this._parameters) as Promise<T>;
        (laPromise as any).get = this.get.bind(this);
        const originalThenFunction = laPromise.then.bind(laPromise);
        laPromise.then = (...args) => {
            if (promiseInstanceCounter in this._resolutionMap) {
                delete this._resolutionMap[promiseInstanceCounter];
                return originalThenFunction(...args);
            }
            return (this.get() as any).then(...args);
        };
        return laPromise as any;
    }

    static AWAIT<T>(callable: PromiscuousPromise | Promise<T>) {
        let awaitedError;
        let awaitedResult;
        let shouldReturn = false;
        let alreadyInvokePromise = false;
        if (callable instanceof PromiscuousPromise) {
            callable = callable.get() as any;
        }
        while (!shouldReturn) {
            //console.log("WE SHOULD RETURN", shouldReturn);
            if (!alreadyInvokePromise) {
                //shouldReturn = true;
                alreadyInvokePromise = true;
                setTimeout(() => {
                    (callable as any).then((res: any) => {
                        awaitedResult = res;
                    }).catch((err: any) => {
                        awaitedError = err;
                    }).finally(() => {
                        shouldReturn = true;
                        console.log("WE SHOULD RETURN", shouldReturn);
                    });
                }, 1000);
            }
        }
        if (awaitedError) throw awaitedError;
        return awaitedResult;
    }

}
