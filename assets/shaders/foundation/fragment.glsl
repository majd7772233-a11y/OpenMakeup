precision highp float;

in vec2 vUv;
in vec3 vWorldPos;
in vec3 vWorldNormal;

uniform vec4 _MainColor;
uniform sampler2D _Mask;
uniform vec4 _Mask_ST; // xy = scale, zw = offset
uniform float _shedat;
uniform float _noise;
uniform vec3 uCameraPosition;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

out vec4 outColor;

void main() {
    // محاسبه UV با scale و offset
    vec2 uvMask = vUv * _Mask_ST.xy + _Mask_ST.zw;

    // جهت دید در فضای جهانی
    vec3 viewDir = normalize(uCameraPosition - vWorldPos);

    // Fresnel
    float fresnelNdotV = dot(normalize(vWorldNormal), viewDir);
    float fresnel = 0.0 + 0.8 * pow(max(1.0 - fresnelNdotV, 0.0001), 1.0);

    // نمونه‌گیری از ماسک
    float maskVal = texture(_Mask, uvMask).r;

    // Alpha remains bounded by the face mask and view angle.
    float alpha = maskVal * fresnel;

    // Finish modes share a subtle procedural surface: matte is clean, shimmer
    // adds sparse highlights, and the higher value strengthens those flecks.
    float seed = hash21(floor(vUv * vec2(420.0, 620.0)));
    float sparkle = smoothstep(0.965, 0.998, seed) * _noise * 0.16;
    vec3 finishedColor = clamp(_MainColor.rgb + vec3(sparkle), 0.0, 1.0);
    vec4 baseColor = vec4(finishedColor, alpha * _shedat * 0.5);
    outColor = baseColor;
    //gl_FragDepth = 0.3;

}
