# (The Coolest Most Realistic) Water Simulator

A **3D water simulation** that _runs entirely on the **GPU**!!_

## Demo

[Water Simulator Demo](https://github.com/user-attachments/assets/38d7c735-bece-4427-be95-33083f61d7c4)

## Here's how it works:

#### Rendering technique: **Ray-marching**

A ray is cast from a 3D camera position through every pixel on screen. Each ray steps forward through 3D space until it intersects the ocean surface.

#### Wave geometry: **Gerstner waves**

The ocean surface is a mathematical 3D height field. Multiple Gerstner wave functions (each with their own direction, amplitude, wavelength, and speed) are summed together to produce realistic rolling 3D wave shapes (apparently the same technique used in AAA game engines like Sea of Thieves and Assassin's Creed: Black Flag.)

## Tools & libraries used (no external libs):

**WebGL:** raw GPU API built into every browser, used directly.

**GLSL:** the shader language that runs entirely on the **GPU**. All wave math, lighting, reflections, Fresnel, foam, tone mapping.

**Vanilla JavaScript:** only for UI event handling (sliders, mouse, touch), camera math, and feeding uniforms to the GPU each frame.

It uses no Three.js, no canvas 2D, no physics engine, no npm packages. Just HTML/CSS/JS that talks directly to the GPU.

That's why it (hopefully) runs so fast despite the complexity.
