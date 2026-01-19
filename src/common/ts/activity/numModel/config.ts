/**
 * NumModel 모듈 설정
 */

// 이미지 경로 설정 (HTML 파일 기준 상대 경로)
export const IMAGE_PATHS = {
  ONE: "images/one.png",
  TEN: "images/ten.png",
  HUNDRED: "images/hun.png",
  THOUSAND: "images/thousand.png",
} as const;

// 자릿수별 이미지 매핑
export const PLACE_IMAGE_MAPPING = {
  thousands: IMAGE_PATHS.THOUSAND,
  hundreds: IMAGE_PATHS.HUNDRED,
  tens: IMAGE_PATHS.TEN,
  ones: IMAGE_PATHS.ONE,
} as const;

// 이미지 애니메이션 설정
export const IMAGE_ANIMATION_CONFIG = {
  duration: 0.3,
  staggerDelay: 0.1,
  ease: "power2.out" as const,
} as const;
