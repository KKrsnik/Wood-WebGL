const vertex = `#version 300 es

layout (location = 0) in vec4 aPosition;
layout (location = 1) in vec2 aTexCoord;
layout (location = 2) in vec4 aNormal;

uniform mat4 uMvpMatrix;

out vec2 vTexCoord;
out vec3 vNormal;

void main() {
    vTexCoord = aTexCoord;
    gl_Position = uMvpMatrix * aPosition;
    vNormal = aNormal.xyz;
}
`;

const fragment = `#version 300 es
precision mediump float;

uniform mediump sampler2D uTexture;

in vec2 vTexCoord;
in vec3 vNormal;

out vec4 oColor;

void main() {
    
    highp vec3 ambientLight = vec3(0.3, 0.3, 0.3);
         highp vec3 directionalLightColor = vec3(1, 1, 1);
         highp vec3 directionalVector = normalize(vec3(0.85, 0.8, 0.75));


         highp float directional = max(dot(vNormal, directionalVector), 0.0);
         vec3 vLighting = ambientLight + (directionalLightColor * directional);
    vec4 color = texture(uTexture, vTexCoord);
    oColor = vec4(color.rgb * vLighting, color.a);
}
`;

export default {
    simple: { vertex, fragment }
};
