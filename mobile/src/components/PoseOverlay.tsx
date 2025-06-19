import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import { PoseData, PoseKeypoint } from '../services/PoseDetectionService';

interface PoseOverlayProps {
    poseData: PoseData | null;
    width: number;
    height: number;
    cameraFacing: 'front' | 'back';
}

const PoseOverlay: React.FC<PoseOverlayProps> = ({
    poseData,
    width,
    height,
    cameraFacing
}) => {
    if (!poseData || !poseData.keypoints) {
        return null;
    }

    // Define pose connections for skeleton rendering
    const connections = [
        // Head
        ['nose', 'left_eye'],
        ['nose', 'right_eye'],
        ['left_eye', 'left_ear'],
        ['right_eye', 'right_ear'],

        // Torso
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],

        // Left arm
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],

        // Right arm
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],

        // Left leg
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],

        // Right leg
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle'],
    ];

    const getKeypoint = (name: string): PoseKeypoint | null => {
        const keypoint = poseData.keypoints.find(kp => kp.name === name);
        return keypoint && keypoint.score > 0.3 ? keypoint : null;
    };

    const transformPoint = (point: PoseKeypoint) => {
        // Flip x-coordinate for front camera
        const x = cameraFacing === 'front' ? width - point.x : point.x;
        return { x, y: point.y };
    };

    const renderConnections = () => {
        return connections.map((connection, index) => {
            const [start, end] = connection;
            const startPoint = getKeypoint(start);
            const endPoint = getKeypoint(end);

            if (!startPoint || !endPoint) {
                return null;
            }

            const transformedStart = transformPoint(startPoint);
            const transformedEnd = transformPoint(endPoint);

            // Color based on confidence
            const avgConfidence = (startPoint.score + endPoint.score) / 2;
            const opacity = Math.max(0.3, avgConfidence);

            return (
                <Line
                    key={`connection-${index}`}
                    x1={transformedStart.x}
                    y1={transformedStart.y}
                    x2={transformedEnd.x}
                    y2={transformedEnd.y}
                    stroke="#00ff00"
                    strokeWidth="2"
                    strokeOpacity={opacity}
                />
            );
        });
    };

    const renderKeypoints = () => {
        return poseData.keypoints
            .filter(kp => kp.score > 0.3)
            .map((keypoint, index) => {
                const transformed = transformPoint(keypoint);

                // Different colors for different body parts
                let color = '#00ff00';
                if (keypoint.name.includes('eye') || keypoint.name.includes('ear') || keypoint.name === 'nose') {
                    color = '#ffff00'; // Yellow for face
                } else if (keypoint.name.includes('shoulder') || keypoint.name.includes('elbow') || keypoint.name.includes('wrist')) {
                    color = '#ff6600'; // Orange for arms
                } else if (keypoint.name.includes('hip') || keypoint.name.includes('knee') || keypoint.name.includes('ankle')) {
                    color = '#0066ff'; // Blue for legs
                }

                const radius = 4 + (keypoint.score * 2); // Size based on confidence

                return (
                    <Circle
                        key={`keypoint-${index}`}
                        cx={transformed.x}
                        cy={transformed.y}
                        r={radius}
                        fill={color}
                        fillOpacity={keypoint.score}
                        stroke="white"
                        strokeWidth="1"
                    />
                );
            });
    };

    return (
        <View style={[styles.overlay, { width, height }]} pointerEvents="none">
            <Svg width={width} height={height}>
                <G>
                    {renderConnections()}
                    {renderKeypoints()}
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
    },
});

export default PoseOverlay; 