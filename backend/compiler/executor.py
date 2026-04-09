from typing import Dict, List, Any


def semantic_to_rover_commands(semantic_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Convierte las instrucciones semánticas a una cola simple de comandos
    que el ESP32 puede ejecutar consultando Railway.
    """
    commands = []

    for inst in semantic_result["instructions"]:
        if inst["type"] == "simple":
            commands.extend(_map_simple_instruction(inst["instruction"], inst["argument"]))

        elif inst["type"] == "combined":
            for part in inst["parts"]:
                commands.extend(_map_simple_instruction(part["instruction"], part["argument"]))

    commands.append({"cmd": "stop", "duration_ms": 500})
    return commands


def _map_simple_instruction(name: str, value: int) -> List[Dict[str, Any]]:
    """
    Mapea una instrucción UMG++ a comandos del rover.
    Ahora avanzar_ctms y avanzar_mts usan DISTANCIA REAL en cm.
    """
    result = []

    if name == "avanzar_vlts":
        # Se deja por tiempo porque "vueltas" depende de calibración mecánica
        direction = "forward" if value > 0 else "backward"
        result.append({"cmd": direction, "duration_ms": abs(value) * 1200})
        result.append({"cmd": "stop", "duration_ms": 300})

    elif name == "avanzar_ctms":
        # Ahora usa distancia real en centímetros
        direction = "forward_cm" if value > 0 else "backward_cm"
        result.append({"cmd": direction, "duration_ms": abs(value)})
        result.append({"cmd": "stop", "duration_ms": 300})

    elif name == "avanzar_mts":
        # Convierte metros a centímetros
        direction = "forward_cm" if value > 0 else "backward_cm"
        result.append({"cmd": direction, "duration_ms": abs(value) * 100})
        result.append({"cmd": "stop", "duration_ms": 300})

    elif name == "girar":
        if value == 1:
            result.append({"cmd": "right", "duration_ms": 500})
        elif value == -1:
            result.append({"cmd": "left", "duration_ms": 500})
        else:
            result.append({"cmd": "forward", "duration_ms": 400})
        result.append({"cmd": "stop", "duration_ms": 300})

    elif name == "rotar":
        direction = "right" if value > 0 else "left"
        result.append({"cmd": direction, "duration_ms": abs(value) * 800})
        result.append({"cmd": "stop", "duration_ms": 300})

    elif name == "caminar":
        direction = "forward" if value > 0 else "backward"
        for _ in range(abs(value)):
            result.append({"cmd": direction, "duration_ms": 350})
            result.append({"cmd": "stop", "duration_ms": 200})

    elif name == "moonwalk":
        direction = "backward" if value > 0 else "forward"
        for _ in range(abs(value)):
            result.append({"cmd": direction, "duration_ms": 300})
            result.append({"cmd": "stop", "duration_ms": 200})

    elif name == "circulo":
        # Aproximación simple
        steps = max(8, abs(value) // 10)
        for _ in range(steps):
            result.append({"cmd": "forward", "duration_ms": 300})
            if value >= 0:
                result.append({"cmd": "right", "duration_ms": 120})
            else:
                result.append({"cmd": "left", "duration_ms": 120})
        result.append({"cmd": "stop", "duration_ms": 300})

    elif name == "cuadrado":
        # Ahora cada lado usa centímetros reales
        lado_cm = abs(value)
        for _ in range(4):
            result.append({"cmd": "forward_cm", "duration_ms": lado_cm})
            result.append({"cmd": "stop", "duration_ms": 200})
            result.append({"cmd": "right", "duration_ms": 500})
            result.append({"cmd": "stop", "duration_ms": 200})

    return result