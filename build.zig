const std = @import("std");

pub fn build(b: *std.Build) void {
    const wasm = b.addExecutable(.{
        .name = "lib",
        .root_source_file = b.path("src/root.zig"),
        .target = b.resolveTargetQuery(.{
            .cpu_arch = .wasm32,
            .os_tag = .freestanding,
        }),
        .optimize = .ReleaseFast,
    });

    wasm.rdynamic = true;
    wasm.entry = .disabled; // -fno-entry

    b.installArtifact(wasm);

    const wasm_step = b.step("wasm", "Build the WASM module");
    wasm_step.dependOn(&wasm.step);
}
