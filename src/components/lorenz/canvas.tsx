import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { LorenzSimulation, MAX_FOSSIL, MAX_PARTICLES, MAX_TRAIL } from "@/lib/lorenz/simulation";
import { useLorenz } from "@/lib/lorenz/store";

const dummy = new THREE.Object3D();
const tmpPos = new Float32Array(MAX_TRAIL * 3);
const tmpCol = new Float32Array(MAX_TRAIL * 3);

function makePointsMat(size: number) {
  return new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    toneMapped: false,
  });
}

function asPerspective(camera: THREE.Camera): THREE.PerspectiveCamera | null {
  return camera instanceof THREE.PerspectiveCamera ? camera : null;
}

function Field() {
  const sim = useMemo(() => new LorenzSimulation(), []);
  const lastGen = useRef(0);
  const lastPerturb = useRef(0);
  const hudAcc = useRef(0);

  const packedPos = useMemo(() => new Float32Array(MAX_PARTICLES * MAX_TRAIL * 3), []);
  const packedCol = useMemo(() => new Float32Array(MAX_PARTICLES * MAX_TRAIL * 3), []);

  const trailGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(packedPos, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    const ca = new THREE.BufferAttribute(packedCol, 3);
    ca.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", pa);
    g.setAttribute("color", ca);
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);
    return g;
  }, [packedPos, packedCol]);

  const fossilGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pa = new THREE.BufferAttribute(sim.fossilPos, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    const ca = new THREE.BufferAttribute(sim.fossilCol, 3);
    ca.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("position", pa);
    g.setAttribute("color", ca);
    g.setDrawRange(0, 0);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 30);
    return g;
  }, [sim]);

  const trailMat = useMemo(() => makePointsMat(2.2), []);
  const fossilMat = useMemo(() => makePointsMat(1.6), []);
  const headGeo = useMemo(() => new THREE.SphereGeometry(0.09, 14, 14), []);
  const headMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xe8f7f4,
        toneMapped: false,
      }),
    [],
  );
  const heads = useMemo(() => {
    const mesh = new THREE.InstancedMesh(headGeo, headMat, MAX_PARTICLES);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return mesh;
  }, [headGeo, headMat]);

  const group = useMemo(() => {
    const g = new THREE.Group();
    g.frustumCulled = false;
    const fossil = new THREE.Points(fossilGeo, fossilMat);
    fossil.frustumCulled = false;
    const trails = new THREE.Points(trailGeo, trailMat);
    trails.frustumCulled = false;
    g.add(fossil);
    g.add(trails);
    g.add(heads);
    return g;
  }, [fossilGeo, fossilMat, trailGeo, trailMat, heads]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.08);
    const state = useLorenz.getState();

    if (lastGen.current !== state.generation) {
      lastGen.current = state.generation;
      sim.seed(state.particles);
      sim.warmup({
        sigma: state.sigma,
        rho: state.rho,
        beta: state.beta,
        speed: Math.max(1, state.speed),
        particles: state.particles,
        colorMode: state.colorMode,
      });
    }

    if (state.perturbNonce !== lastPerturb.current) {
      lastPerturb.current = state.perturbNonce;
      if (state.perturbNonce > 0) sim.perturb(state.particles);
    }

    if (!state.paused) {
      sim.step(d, {
        sigma: state.sigma,
        rho: state.rho,
        beta: state.beta,
        speed: state.speed,
        particles: state.particles,
        colorMode: state.colorMode,
      });
    }

    const tLen = Math.min(MAX_TRAIL, Math.max(64, state.trail | 0));
    const n = Math.min(MAX_PARTICLES, Math.max(1, state.particles | 0));

    let packed = 0;
    for (let i = 0; i < n; i++) {
      const count = sim.writeTrailOrdered(i, tLen, tmpPos, tmpCol);
      packedPos.set(tmpPos.subarray(0, count * 3), packed * 3);
      packedCol.set(tmpCol.subarray(0, count * 3), packed * 3);
      packed += count;
    }
    const tp = trailGeo.getAttribute("position") as THREE.BufferAttribute;
    const tc = trailGeo.getAttribute("color") as THREE.BufferAttribute;
    tp.needsUpdate = true;
    tc.needsUpdate = true;
    trailGeo.setDrawRange(0, packed);

    const fp = fossilGeo.getAttribute("position") as THREE.BufferAttribute;
    const fc = fossilGeo.getAttribute("color") as THREE.BufferAttribute;
    fp.needsUpdate = true;
    fc.needsUpdate = true;
    fossilGeo.setDrawRange(0, Math.min(MAX_FOSSIL, sim.fossilFilled));

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < n) {
        dummy.position.set(sim.headPos[i * 3]!, sim.headPos[i * 3 + 1]!, sim.headPos[i * 3 + 2]!);
        dummy.scale.setScalar(1);
      } else {
        dummy.position.set(0, 0, 0);
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    }
    heads.instanceMatrix.needsUpdate = true;
    heads.count = n;

    hudAcc.current += d;
    if (hudAcc.current > 0.08) {
      hudAcc.current = 0;
      const lead = sim.lead();
      state.setLead(lead.x, lead.y, lead.z, sim.simTime);
    }
  });

  return <primitive object={group} />;
}

function CameraRig() {
  const autoRotate = useLorenz((s) => s.autoRotate);
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.06;
    c.enablePan = false;
    c.autoRotateSpeed = 0.4;
    c.minDistance = 7;
    c.maxDistance = 42;
    c.minPolarAngle = 0.35;
    c.maxPolarAngle = Math.PI - 0.35;
    c.target.set(0, 0, 0);
    c.update();
    controlsRef.current = c;
    return () => {
      c.dispose();
      if (controlsRef.current === c) controlsRef.current = null;
    };
  }, [camera, gl]);

  useFrame(() => {
    const c = controlsRef.current;
    if (!c) return;
    c.autoRotate = autoRotate;
    c.update();
  });

  return null;
}

function FitCamera() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const apply = () => {
      const persp = asPerspective(camera);
      const parent = gl.domElement.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = Math.max(1, parent?.clientHeight || window.innerHeight);
      if (w < 2 || h < 2 || !persp) return;
      persp.aspect = w / h;
      persp.updateProjectionMatrix();
    };
    apply();
    const parent = gl.domElement.parentElement;
    const ro = parent ? new ResizeObserver(apply) : null;
    if (parent) ro?.observe(parent);
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [camera, gl]);
  return null;
}

export default function LorenzCanvas() {
  const [ctxKey, setCtxKey] = useState(0);

  return (
    <Canvas
      key={ctxKey}
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      camera={{ position: [0, 4.2, 13], fov: 42, near: 0.1, far: 200 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor("#08090b", 1);
        gl.toneMapping = THREE.NoToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        const persp = asPerspective(camera);
        const parent = gl.domElement.parentElement;
        const w = parent?.clientWidth || window.innerWidth;
        const h = Math.max(1, parent?.clientHeight || window.innerHeight);
        if (persp) {
          persp.aspect = w / h;
          persp.updateProjectionMatrix();
        }
        const canvas = gl.domElement;
        const onLost = (event: Event) => {
          event.preventDefault();
          setCtxKey((k) => k + 1);
        };
        canvas.addEventListener("webglcontextlost", onLost, { once: true });
      }}
    >
      <FitCamera />
      <Field />
      <CameraRig />
    </Canvas>
  );
}
