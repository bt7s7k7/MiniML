import { Platform } from "../platform/Platform"
import { DeferredSerializationValue } from "../struct/DeferredSerializationValue"
import { Type } from "../struct/Type"
import { VitePlatform } from "./VitePlatform"
// @ts-ignore
import * as os from "node:os"
// @ts-ignore
import * as fs from "node:fs/promises"
// @ts-ignore
import * as path from "node:path"
import { unreachable } from "../comTypes/util"

export function VitePlatformPlugin() {
    return {
        name: "platform:vite",
        configureServer(server: any) {
            function respond(request: VitePlatform.Request, response: DeferredSerializationValue | Platform.PlatformError) {
                if (response instanceof Platform.PlatformError) {
                    server.ws.send("platform:response", VitePlatform.Response_t.serialize({
                        id: request.id,
                        error: true,
                        data: DeferredSerializationValue.prepareSerialization({ message: response.message, code: response.code, target: response.target }, VitePlatform.ResponseError_t)
                    }))
                } else {
                    server.ws.send("platform:response", VitePlatform.Response_t.serialize({ id: request.id, error: false, data: response }))
                }
            }

            server.ws.on("platform:request", async (data: unknown) => {
                const request = VitePlatform.Request_t.deserialize(data)

                try {
                    const data = request.data
                    if (data.kind == "print") {
                        // eslint-disable-next-line no-console
                        console.log(data.message)
                        respond(request, DeferredSerializationValue.prepareSerialization(null, Type.empty))
                    } else if (data.kind == "getPlatform") {
                        respond(request, DeferredSerializationValue.prepareSerialization(new VitePlatform.PlatformInfo({
                            platform: os.platform(),
                            name: `${os.type()} ${os.release()}`,
                            homedir: os.homedir(),
                            pwd: path.resolve()
                        }), VitePlatform.PlatformInfo.ref()))
                    } else if (data.kind == "readFile") {
                        respond(request, DeferredSerializationValue.prepareSerialization(await fs.readFile(data.path).then((v: any) => v.toString()), Type.string))
                    } else if (data.kind == "readBytes") {
                        respond(request, DeferredSerializationValue.prepareSerialization(await fs.readFile(data.path), Type.passthrough<ArrayBuffer>()))
                    } else if (data.kind == "writeFile") {
                        respond(request, DeferredSerializationValue.prepareSerialization(await fs.writeFile(data.path, data.content), Type.empty))
                    } else if (data.kind == "writeBytes") {
                        respond(request, DeferredSerializationValue.prepareSerialization(await fs.writeFile(data.path, data.content), Type.empty))
                    } else if (data.kind == "readdir") {
                        respond(request, DeferredSerializationValue.prepareSerialization(await fs.readdir(data.path, { withFileTypes: true }).then((v: any[]) => v.map(v => ({
                            name: v.name,
                            path: path.resolve(v.path, v.name),
                            isDirectory: v.isDirectory()
                        } as Platform.Stats))), VitePlatform.Stats.ref().as(Type.array)))
                    } else if (data.kind == "stat") {
                        respond(request, DeferredSerializationValue.prepareSerialization(await fs.stat(data.path).then((v: any) => ({
                            name: path.basename(data.path),
                            path: path.resolve(data.path),
                            isDirectory: v.isDirectory()
                        } as Platform.Stats)), Type.empty))
                    } else unreachable()
                } catch (err) {
                    respond(request, new Platform.PlatformError("Internal server error"))
                    throw err
                }
            })
        }
    }
}
