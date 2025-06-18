/**
 * Video Annotation Tool - Professional video analysis interface
 * Features: Drawing tools, text annotations, timeline markers, form highlights
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    IconButton,
    Button,
    Slider,
    Tooltip,
    Paper,
    Toolbar,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    PlayArrow,
    Pause,
    Stop,
    SkipPrevious,
    SkipNext,
    VolumeUp,
    VolumeOff,
    Fullscreen,
    Create as DrawIcon,
    TextFields as TextIcon,
    Highlight as HighlightIcon,
    Circle as CircleIcon,
    CropFree as RectangleIcon,
    Timeline as TimelineIcon,
    Save as SaveIcon,
    Undo as UndoIcon,
    Redo as RedoIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    ColorLens as ColorIcon,
    FormatSize as SizeIcon,
} from '@mui/icons-material';
import { Stage, Layer, Line, Text, Circle, Rect, Arrow } from 'react-konva';
import ReactPlayer from 'react-player';

import { VideoAnnotation, WorkoutSession } from '../types';

interface VideoAnnotationToolProps {
    session: WorkoutSession;
    videoUrl: string;
    annotations: VideoAnnotation[];
    onSaveAnnotations: (annotations: VideoAnnotation[]) => void;
    onClose: () => void;
    readonly?: boolean;
}

interface DrawingTool {
    type: 'pen' | 'text' | 'highlight' | 'circle' | 'rectangle' | 'arrow';
    color: string;
    size: number;
}

interface Annotation {
    id: string;
    type: 'drawing' | 'text' | 'highlight' | 'shape';
    tool: string;
    points?: number[];
    text?: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: string;
    size: number;
    timestamp: number;
    visible: boolean;
}

export const VideoAnnotationTool: React.FC<VideoAnnotationToolProps> = ({
    session,
    videoUrl,
    annotations: initialAnnotations,
    onSaveAnnotations,
    onClose,
    readonly = false
}) => {
    // Video player state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    // Annotation state
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [currentTool, setCurrentTool] = useState<DrawingTool>({
        type: 'pen',
        color: '#FF0000',
        size: 3
    });
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<number[]>([]);
    const [textInput, setTextInput] = useState('');
    const [showTextDialog, setShowTextDialog] = useState(false);
    const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
    const [annotationHistory, setAnnotationHistory] = useState<Annotation[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [visibleTimeRange, setVisibleTimeRange] = useState({ start: 0, end: 30 });

    // Refs
    const playerRef = useRef<ReactPlayer>(null);
    const stageRef = useRef<any>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
    const sizes = [1, 2, 3, 5, 8, 12];

    useEffect(() => {
        // Convert initial annotations to internal format
        const convertedAnnotations = initialAnnotations.map(ann => ({
            id: ann.id,
            type: ann.type as any,
            tool: 'pen',
            x: ann.position.x,
            y: ann.position.y,
            color: ann.color,
            size: ann.size,
            timestamp: ann.timestamp,
            visible: true,
            text: ann.content
        }));
        setAnnotations(convertedAnnotations);
    }, [initialAnnotations]);

    const saveToHistory = useCallback((newAnnotations: Annotation[]) => {
        const newHistory = annotationHistory.slice(0, historyIndex + 1);
        newHistory.push([...newAnnotations]);
        setAnnotationHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [annotationHistory, historyIndex]);

    const handleProgress = (state: { played: number; playedSeconds: number }) => {
        setCurrentTime(state.playedSeconds);
    };

    const handleDuration = (duration: number) => {
        setDuration(duration);
    };

    const handleSeek = (time: number) => {
        if (playerRef.current) {
            playerRef.current.seekTo(time);
            setCurrentTime(time);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getVisibleAnnotations = () => {
        return annotations.filter(ann =>
            ann.visible &&
            ann.timestamp >= currentTime - 1 &&
            ann.timestamp <= currentTime + 1
        );
    };

    const handleMouseDown = (e: any) => {
        if (readonly || currentTool.type === 'text') return;

        const pos = e.target.getStage().getPointerPosition();
        setIsDrawing(true);

        if (currentTool.type === 'pen') {
            setCurrentPath([pos.x, pos.y]);
        }
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing || readonly) return;

        const stage = e.target.getStage();
        const point = stage.getPointerPosition();

        if (currentTool.type === 'pen') {
            setCurrentPath(prev => [...prev, point.x, point.y]);
        }
    };

    const handleMouseUp = () => {
        if (!isDrawing || readonly) return;

        setIsDrawing(false);

        if (currentTool.type === 'pen' && currentPath.length > 0) {
            const newAnnotation: Annotation = {
                id: `ann_${Date.now()}`,
                type: 'drawing',
                tool: currentTool.type,
                points: currentPath,
                x: currentPath[0],
                y: currentPath[1],
                color: currentTool.color,
                size: currentTool.size,
                timestamp: currentTime,
                visible: true
            };

            const newAnnotations = [...annotations, newAnnotation];
            setAnnotations(newAnnotations);
            saveToHistory(newAnnotations);
        }

        setCurrentPath([]);
    };

    const handleStageClick = (e: any) => {
        if (readonly || currentTool.type !== 'text') return;

        const pos = e.target.getStage().getPointerPosition();
        setTextPosition(pos);
        setShowTextDialog(true);
    };

    const handleAddText = () => {
        if (textInput.trim()) {
            const newAnnotation: Annotation = {
                id: `ann_${Date.now()}`,
                type: 'text',
                tool: 'text',
                text: textInput,
                x: textPosition.x,
                y: textPosition.y,
                color: currentTool.color,
                size: currentTool.size,
                timestamp: currentTime,
                visible: true
            };

            const newAnnotations = [...annotations, newAnnotation];
            setAnnotations(newAnnotations);
            saveToHistory(newAnnotations);
        }

        setTextInput('');
        setShowTextDialog(false);
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setAnnotations(annotationHistory[historyIndex - 1]);
        }
    };

    const handleRedo = () => {
        if (historyIndex < annotationHistory.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setAnnotations(annotationHistory[historyIndex + 1]);
        }
    };

    const handleDeleteAnnotation = (id: string) => {
        const newAnnotations = annotations.filter(ann => ann.id !== id);
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
    };

    const handleSave = () => {
        // Convert internal annotations back to API format
        const apiAnnotations: VideoAnnotation[] = annotations.map(ann => ({
            id: ann.id,
            sessionId: session.id,
            trainerId: 'current_trainer', // Would come from auth
            timestamp: ann.timestamp,
            type: ann.type === 'text' ? 'text' : ann.type === 'drawing' ? 'drawing' : 'highlight',
            content: ann.text || '',
            position: { x: ann.x, y: ann.y },
            color: ann.color,
            size: ann.size,
            createdAt: new Date().toISOString()
        }));

        onSaveAnnotations(apiAnnotations);
    };

    const renderToolbar = () => (
        <Paper sx={{ p: 1, mb: 2 }}>
            <Toolbar sx={{ minHeight: 'auto !important' }}>
                {/* Drawing Tools */}
                <Box display="flex" gap={1} mr={2}>
                    {[
                        { type: 'pen', icon: <DrawIcon />, label: 'Draw' },
                        { type: 'text', icon: <TextIcon />, label: 'Text' },
                        { type: 'highlight', icon: <HighlightIcon />, label: 'Highlight' },
                        { type: 'circle', icon: <CircleIcon />, label: 'Circle' },
                        { type: 'rectangle', icon: <RectangleIcon />, label: 'Rectangle' },
                    ].map((tool) => (
                        <Tooltip key={tool.type} title={tool.label}>
                            <IconButton
                                color={currentTool.type === tool.type ? 'primary' : 'default'}
                                onClick={() => setCurrentTool(prev => ({ ...prev, type: tool.type as any }))}
                                disabled={readonly}
                            >
                                {tool.icon}
                            </IconButton>
                        </Tooltip>
                    ))}
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Colors */}
                <Box display="flex" gap={0.5} mr={2}>
                    {colors.map(color => (
                        <IconButton
                            key={color}
                            size="small"
                            onClick={() => setCurrentTool(prev => ({ ...prev, color }))}
                            sx={{
                                backgroundColor: color,
                                border: currentTool.color === color ? '2px solid #000' : 'none',
                                width: 24,
                                height: 24,
                                minWidth: 24,
                                '&:hover': { backgroundColor: color, opacity: 0.8 }
                            }}
                            disabled={readonly}
                        />
                    ))}
                </Box>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Size */}
                <FormControl size="small" sx={{ minWidth: 80, mr: 2 }}>
                    <Select
                        value={currentTool.size}
                        onChange={(e) => setCurrentTool(prev => ({ ...prev, size: e.target.value as number }))}
                        disabled={readonly}
                    >
                        {sizes.map(size => (
                            <MenuItem key={size} value={size}>{size}px</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Actions */}
                <Box display="flex" gap={1}>
                    <Tooltip title="Undo">
                        <IconButton
                            onClick={handleUndo}
                            disabled={readonly || historyIndex <= 0}
                        >
                            <UndoIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Redo">
                        <IconButton
                            onClick={handleRedo}
                            disabled={readonly || historyIndex >= annotationHistory.length - 1}
                        >
                            <RedoIcon />
                        </IconButton>
                    </Tooltip>

                    {!readonly && (
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSave}
                            sx={{ ml: 2 }}
                        >
                            Save Annotations
                        </Button>
                    )}
                </Box>
            </Toolbar>
        </Paper>
    );

    const renderVideoControls = () => (
        <Paper sx={{ p: 2, mt: 2 }}>
            {/* Timeline */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Typography variant="body2" sx={{ minWidth: 60 }}>
                    {formatTime(currentTime)}
                </Typography>

                <Slider
                    value={currentTime}
                    max={duration}
                    onChange={(_, value) => handleSeek(value as number)}
                    sx={{ flex: 1 }}
                />

                <Typography variant="body2" sx={{ minWidth: 60 }}>
                    {formatTime(duration)}
                </Typography>
            </Box>

            {/* Controls */}
            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                <IconButton onClick={() => handleSeek(Math.max(0, currentTime - 10))}>
                    <SkipPrevious />
                </IconButton>

                <IconButton onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause /> : <PlayArrow />}
                </IconButton>

                <IconButton onClick={() => handleSeek(Math.min(duration, currentTime + 10))}>
                    <SkipNext />
                </IconButton>

                <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

                <IconButton onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                </IconButton>

                <Slider
                    value={volume}
                    max={1}
                    step={0.1}
                    onChange={(_, value) => setVolume(value as number)}
                    sx={{ width: 100 }}
                />

                <FormControl size="small" sx={{ minWidth: 80, ml: 2 }}>
                    <Select
                        value={playbackRate}
                        onChange={(e) => setPlaybackRate(e.target.value as number)}
                    >
                        <MenuItem value={0.25}>0.25x</MenuItem>
                        <MenuItem value={0.5}>0.5x</MenuItem>
                        <MenuItem value={1}>1x</MenuItem>
                        <MenuItem value={1.25}>1.25x</MenuItem>
                        <MenuItem value={1.5}>1.5x</MenuItem>
                        <MenuItem value={2}>2x</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </Paper>
    );

    const renderAnnotationsList = () => {
        const timelineAnnotations = annotations.filter(ann =>
            ann.timestamp >= visibleTimeRange.start &&
            ann.timestamp <= visibleTimeRange.end
        );

        return (
            <Card sx={{ maxHeight: 400, overflow: 'auto' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Annotations Timeline
                    </Typography>

                    <List dense>
                        {timelineAnnotations.map((annotation) => (
                            <ListItem
                                key={annotation.id}
                                secondaryAction={
                                    !readonly && (
                                        <Box>
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    const newAnnotations = annotations.map(ann =>
                                                        ann.id === annotation.id
                                                            ? { ...ann, visible: !ann.visible }
                                                            : ann
                                                    );
                                                    setAnnotations(newAnnotations);
                                                }}
                                            >
                                                {annotation.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteAnnotation(annotation.id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    )
                                }
                            >
                                <ListItemIcon>
                                    <Chip
                                        size="small"
                                        label={formatTime(annotation.timestamp)}
                                        onClick={() => handleSeek(annotation.timestamp)}
                                        style={{ backgroundColor: annotation.color, color: '#fff' }}
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={annotation.text || `${annotation.tool} annotation`}
                                    secondary={`${annotation.type} - ${annotation.size}px`}
                                />
                            </ListItem>
                        ))}
                    </List>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
                <Typography variant="h5">
                    Video Analysis: {session.exerciseType} Session
                </Typography>
                <Button onClick={onClose}>Close</Button>
            </Box>

            {/* Toolbar */}
            {renderToolbar()}

            {/* Main Content */}
            <Box display="flex" flex={1} gap={2} p={2}>
                {/* Video and Canvas */}
                <Box flex={1}>
                    <Paper sx={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                        <ReactPlayer
                            ref={playerRef}
                            url={videoUrl}
                            width="100%"
                            height="100%"
                            playing={isPlaying}
                            volume={volume}
                            muted={isMuted}
                            playbackRate={playbackRate}
                            onProgress={handleProgress}
                            onDuration={handleDuration}
                            style={{ position: 'absolute', top: 0, left: 0 }}
                        />

                        {/* Annotation Canvas */}
                        <Stage
                            width={videoContainerRef.current?.clientWidth || 800}
                            height={videoContainerRef.current?.clientHeight || 450}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onClick={handleStageClick}
                            ref={stageRef}
                            style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
                        >
                            <Layer>
                                {/* Render existing annotations */}
                                {getVisibleAnnotations().map(annotation => {
                                    if (annotation.type === 'drawing' && annotation.points) {
                                        return (
                                            <Line
                                                key={annotation.id}
                                                points={annotation.points}
                                                stroke={annotation.color}
                                                strokeWidth={annotation.size}
                                                tension={0.5}
                                                lineCap="round"
                                                globalCompositeOperation="source-over"
                                            />
                                        );
                                    }

                                    if (annotation.type === 'text') {
                                        return (
                                            <Text
                                                key={annotation.id}
                                                x={annotation.x}
                                                y={annotation.y}
                                                text={annotation.text}
                                                fontSize={annotation.size * 4}
                                                fill={annotation.color}
                                                fontFamily="Arial"
                                            />
                                        );
                                    }

                                    return null;
                                })}

                                {/* Current drawing path */}
                                {isDrawing && currentPath.length > 0 && (
                                    <Line
                                        points={currentPath}
                                        stroke={currentTool.color}
                                        strokeWidth={currentTool.size}
                                        tension={0.5}
                                        lineCap="round"
                                        globalCompositeOperation="source-over"
                                    />
                                )}
                            </Layer>
                        </Stage>
                    </Paper>

                    {/* Video Controls */}
                    {renderVideoControls()}
                </Box>

                {/* Sidebar */}
                <Box width={300}>
                    {renderAnnotationsList()}
                </Box>
            </Box>

            {/* Text Input Dialog */}
            {showTextDialog && (
                <Box
                    position="fixed"
                    top="50%"
                    left="50%"
                    sx={{ transform: 'translate(-50%, -50%)', zIndex: 1000 }}
                >
                    <Paper sx={{ p: 2, minWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>
                            Add Text Annotation
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Enter your feedback..."
                            autoFocus
                        />
                        <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                            <Button onClick={() => setShowTextDialog(false)}>Cancel</Button>
                            <Button variant="contained" onClick={handleAddText}>Add</Button>
                        </Box>
                    </Paper>
                </Box>
            )}
        </Box>
    );
}; 