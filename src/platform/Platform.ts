export abstract class Platform {
    public abstract print(message: any): Promise<void>
    public abstract readFile(path: string): Promise<string>
    public abstract readBytes(path: string): Promise<ArrayBuffer>
    public abstract writeFile(path: string, content: string): Promise<void>
    public abstract writeBytes(path: string, content: ArrayBuffer): Promise<void>
    public abstract readdir(path: string): Promise<Platform.Stats[]>
    public abstract stat(path: string): Promise<Platform.Stats>
    public abstract getPlatform(): Promise<Platform.PlatformInfo>


    public static global: Platform = null!
}

export namespace Platform {
    export class PlatformError extends Error {
        name = "PlatformError"

        public code: "not-found" | "access-denied" | "invalid-target" | null = null
        public target: string | null = null
    }

    export interface PlatformInfo {
        platform: string
        name: string
        homedir: string
        pwd: string
    }

    export interface Stats {
        name: string
        path: string
        isDirectory: boolean
    }
}
