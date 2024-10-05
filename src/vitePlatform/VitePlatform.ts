import { Values } from "../comTypes/types"
import { Task } from "../comTypes/util"
import { Platform } from "../platform/Platform"
import { DeferredSerializationValue } from "../struct/DeferredSerializationValue"
import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"

export class VitePlatform extends Platform {
    protected readonly _socket
    protected _nextId = 0
    protected readonly _requests = new Map<number, Task<DeferredSerializationValue>>()

    public async print(message: any): Promise<void> {
        return (await this._sendRequest({ kind: "print", message })).getValue(Type.empty)
    }

    public async readFile(path: string): Promise<string> {
        return (await this._sendRequest({ kind: "readFile", path })).getValue(Type.string)
    }

    public async readBytes(path: string): Promise<ArrayBuffer> {
        return (await this._sendRequest({ kind: "readFile", path })).getValue(Type.passthrough<ArrayBuffer>())
    }

    public async writeFile(path: string, content: string): Promise<void> {
        return (await this._sendRequest({ kind: "writeFile", path, content })).getValue(Type.empty)
    }

    public async writeBytes(path: string, content: ArrayBuffer): Promise<void> {
        return (await this._sendRequest({ kind: "writeBytes", path, content })).getValue(Type.empty)
    }

    public async readdir(path: string): Promise<Platform.Stats[]> {
        return (await this._sendRequest({ kind: "readdir", path })).getValue(VitePlatform.Stats.ref().as(Type.array))
    }

    public async stat(path: string): Promise<Platform.Stats> {
        return (await this._sendRequest({ kind: "stat", path })).getValue(VitePlatform.Stats.ref())
    }

    public async getPlatform(): Promise<Platform.PlatformInfo> {
        return (await this._sendRequest({ kind: "getPlatform" })).getValue(VitePlatform.PlatformInfo.ref())
    }

    protected _sendRequest(requestData: VitePlatform.RequestData) {
        const request: VitePlatform.Request = { id: this._nextId++, data: requestData }
        const task = new Task<DeferredSerializationValue>()

        this._requests.set(request.id, task)
        this._socket.send("platform:request", request)

        return task.asPromise()
    }

    constructor() {
        super()

        if (!import.meta.hot) {
            throw new Error("Cannot use VitePlatform, application is not in development mode")
        }
        this._socket = import.meta.hot

        this._socket.on("platform:response", (responseData) => {
            const response = VitePlatform.Response_t.deserialize(responseData)
            const task = this._requests.get(response.id)
            this._requests.delete(response.id)
            if (task == null) return
            if (response.error) {
                const errorData = response.data.getValue(VitePlatform.ResponseError_t) as Type.Extract<typeof VitePlatform["ResponseError_t"]>

                const error = new Platform.PlatformError(errorData.message)
                if (errorData.code != null) error.code = errorData.code
                if (errorData.target != null) error.target = errorData.target

                task.reject(error)
            } else {
                task.resolve(response.data)
            }
        })
    }
}

export namespace VitePlatform {
    const _requestTypes = {
        print: Type.object({ kind: Type.enum("print"), message: Type.passthrough<object>() }),
        readFile: Type.object({ kind: Type.enum("readFile"), path: Type.string }),
        readBytes: Type.object({ kind: Type.enum("readBytes"), path: Type.string }),
        writeFile: Type.object({ kind: Type.enum("writeFile"), path: Type.string, content: Type.string }),
        writeBytes: Type.object({ kind: Type.enum("writeBytes"), path: Type.string, content: Type.passthrough<ArrayBuffer>() }),
        readdir: Type.object({ kind: Type.enum("readdir"), path: Type.string }),
        stat: Type.object({ kind: Type.enum("stat"), path: Type.string }),
        getPlatform: Type.object({ kind: Type.enum("getPlatform") }),
    }

    export type RequestData = Type.Extract<Values<typeof _requestTypes>>

    export const RequestData_t = Type.byKeyUnion<RequestData, "kind">("RequestData", "kind", _requestTypes)

    export const Request_t = Type.object({
        id: Type.number,
        data: RequestData_t
    })

    export type Request = Type.Extract<typeof Request_t>

    export const Response_t = Type.object({
        id: Type.number,
        error: Type.boolean,
        data: DeferredSerializationValue.ref()
    })

    export const ResponseError_t = Type.object({
        message: Type.string,
        code: Type.enum<(Platform.PlatformError["code"] & string)[]>("not-found", "access-denied", "invalid-target").as(Type.nullable),
        target: Type.string.as(Type.nullable)
    })

    export class Stats extends Struct.define("Stats", {
        name: Type.string,
        path: Type.string,
        isDirectory: Type.boolean,
    }) implements Platform.Stats { }

    export class PlatformInfo extends Struct.define("PlatformInfo", {
        platform: Type.string,
        name: Type.string,
        homedir: Type.string,
        pwd: Type.string,
    }) implements Platform.PlatformInfo { }
}
