// Types for ecctrl@1.0.92, imported via the "ecctrl-lib" webpack alias (next.config.mjs).
// The package's own .d.ts re-exports its raw .tsx source, which fails our strict type-check, so we
// declare the small surface we use here instead.
declare module "ecctrl-lib" {
  import type { RapierRigidBody, RigidBodyProps } from "@react-three/rapier";
  import type { ForwardRefExoticComponent, ReactNode, RefAttributes, JSX } from "react";

  type Vec3 = { x: number; y: number; z: number };

  export interface CustomEcctrlRigidBody extends RapierRigidBody {
    rotateCamera?: (x: number, y: number) => void;
    rotateCharacterOnY?: (rad: number) => void;
  }

  export interface EcctrlProps extends RigidBodyProps {
    children?: ReactNode;
    debug?: boolean;
    capsuleHalfHeight?: number;
    capsuleRadius?: number;
    floatHeight?: number;
    characterInitDir?: number;
    followLight?: boolean;
    followLightPos?: Vec3;
    disableControl?: boolean;
    disableFollowCam?: boolean;
    camInitDis?: number;
    camMaxDis?: number;
    camMinDis?: number;
    camUpLimit?: number;
    camLowLimit?: number;
    camInitDir?: { x: number; y: number };
    camTargetPos?: Vec3;
    camMoveSpeed?: number;
    camZoomSpeed?: number;
    camCollision?: boolean;
    camListenerTarget?: "document" | "domElement";
    maxVelLimit?: number;
    turnSpeed?: number;
    sprintMult?: number;
    jumpVel?: number;
    autoBalance?: boolean;
    animated?: boolean;
    mode?: string;
  }

  export type AnimationSet = {
    idle?: string;
    walk?: string;
    run?: string;
    jump?: string;
    jumpIdle?: string;
    jumpLand?: string;
    fall?: string;
    action1?: string;
    action2?: string;
    action3?: string;
    action4?: string;
  };

  export function EcctrlAnimation(props: { characterURL: string; animationSet: AnimationSet; children: ReactNode }): JSX.Element;

  export const EcctrlJoystick: ForwardRefExoticComponent<
    {
      joystickRunSensitivity?: number;
      joystickPositionLeft?: number;
      joystickPositionBottom?: number;
      joystickHeightAndWidth?: number;
      buttonNumber?: number;
      joystickBaseProps?: Record<string, unknown>;
      joystickStickProps?: Record<string, unknown>;
      joystickHandleProps?: Record<string, unknown>;
    } & RefAttributes<HTMLDivElement>
  >;

  const Ecctrl: ForwardRefExoticComponent<EcctrlProps & RefAttributes<CustomEcctrlRigidBody>>;
  export default Ecctrl;
}
