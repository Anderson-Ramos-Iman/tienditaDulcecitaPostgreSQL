package com.ramosiman.tienditadulcecita

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.ramosiman.tienditadulcecita.data.Producto
import com.ramosiman.tienditadulcecita.ui.theme.TienditaDulcecitaTheme

val ColorHeader  = Color(0xFF0F172A)
val ColorPrimary = Color(0xFF3B82F6)
val ColorBg      = Color(0xFFF1F5F9)
val ColorSurface = Color(0xFFFFFFFF)
val ColorText    = Color(0xFF1E293B)
val ColorMuted   = Color(0xFF64748B)
val ColorBorder  = Color(0xFFE2E8F0)
val ColorSuccess = Color(0xFF16A34A)
val ColorWarning = Color(0xFFD97706)
val ColorDanger  = Color(0xFFDC2626)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TienditaDulcecitaTheme {
                CatalogoScreen()
            }
        }
    }
}

@Composable
fun CatalogoScreen(vm: CatalogoViewModel = viewModel()) {
    val uiState          by vm.uiState.collectAsState()
    val search           by vm.searchQuery.collectAsState()
    val soloStock        by vm.soloConStock.collectAsState()
    val categorias       by vm.categorias.collectAsState()
    val activeCatId      by vm.activeCategoriaId.collectAsState()
    val currentPage      by vm.currentPage.collectAsState()
    val filteredProducts by vm.productosFiltrados.collectAsState()
    val pageData         by vm.productosPagina.collectAsState()
    val totalPags        by vm.totalPaginas.collectAsState()

    var catMenuOpen by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().background(ColorBg).navigationBarsPadding()) {

        /* ── HEADER ── */
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(ColorHeader)
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(34.dp)
                            .clip(RoundedCornerShape(9.dp))
                            .background(ColorPrimary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🛍", fontSize = 16.sp)
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Tiendita Dulcecita",
                        color = Color(0xFFF1F5F9),
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                IconButton(onClick = { vm.cargarProductos() }) {
                    Icon(Icons.Default.Refresh, contentDescription = "Recargar", tint = Color(0xFF94A3B8))
                }
            }
        }

        /* ── SEARCH ── */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 8.dp)
                .clip(RoundedCornerShape(99.dp))
                .background(ColorSurface)
                .border(1.5.dp, ColorBorder, RoundedCornerShape(99.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Search, contentDescription = null, tint = ColorMuted, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            BasicTextField(
                value = search,
                onValueChange = { vm.searchQuery.value = it; vm.irAPagina(1) },
                modifier = Modifier.weight(1f),
                singleLine = true,
                decorationBox = { inner ->
                    if (search.isEmpty()) Text("Buscar productos...", color = ColorMuted, fontSize = 14.sp)
                    inner()
                },
                textStyle = androidx.compose.ui.text.TextStyle(color = ColorText, fontSize = 14.sp)
            )
        }

        /* ── FILTER ROW: dropdown + con stock + count ── */
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(ColorSurface)
                .border(
                    width = 1.dp,
                    color = ColorBorder,
                    shape = RoundedCornerShape(0.dp)
                )
                .padding(horizontal = 14.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            /* Category dropdown button */
            Box {
                val isFiltered = activeCatId != null
                val btnBg      = if (isFiltered) ColorPrimary else ColorSurface
                val btnBorder  = if (isFiltered) ColorPrimary else ColorBorder
                val btnTint    = if (isFiltered) Color.White  else ColorMuted

                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(btnBg)
                        .border(1.5.dp, btnBorder, RoundedCornerShape(8.dp))
                        .clickableNoRipple { catMenuOpen = !catMenuOpen }
                        .padding(horizontal = 12.dp, vertical = 7.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Menu, null, tint = btnTint, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(
                        text = if (isFiltered) {
                            val cat = categorias.find { it.id == activeCatId }
                            "${cat?.icono.orEmpty()} ${cat?.nombre ?: "Categoría"}".trim()
                        } else "Categorías",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = btnTint,
                        maxLines = 1
                    )
                    Spacer(Modifier.width(4.dp))
                    Icon(
                        if (catMenuOpen) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                        null,
                        tint = btnTint,
                        modifier = Modifier.size(16.dp)
                    )
                }

                DropdownMenu(
                    expanded = catMenuOpen,
                    onDismissRequest = { catMenuOpen = false },
                    modifier = Modifier
                        .background(ColorSurface)
                        .widthIn(min = 220.dp)
                ) {
                    /* "Todo" option */
                    DropdownMenuItem(
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(22.dp), contentAlignment = Alignment.Center) {
                                    if (activeCatId == null)
                                        Icon(Icons.Default.Check, null, tint = ColorPrimary, modifier = Modifier.size(16.dp))
                                }
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "Todo",
                                    fontSize = 14.sp,
                                    fontWeight = if (activeCatId == null) FontWeight.Bold else FontWeight.Normal,
                                    color = if (activeCatId == null) ColorPrimary else ColorText
                                )
                            }
                        },
                        onClick = { vm.seleccionarCategoria(null); catMenuOpen = false }
                    )
                    HorizontalDivider(color = ColorBorder, thickness = 0.5.dp)
                    categorias.forEach { cat ->
                        val isActive = cat.id == activeCatId
                        DropdownMenuItem(
                            text = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(Modifier.size(22.dp), contentAlignment = Alignment.Center) {
                                        if (isActive)
                                            Icon(Icons.Default.Check, null, tint = ColorPrimary, modifier = Modifier.size(16.dp))
                                    }
                                    Spacer(Modifier.width(8.dp))
                                    if (!cat.icono.isNullOrBlank()) {
                                        Text(cat.icono, fontSize = 15.sp)
                                        Spacer(Modifier.width(6.dp))
                                    }
                                    Text(
                                        cat.nombre,
                                        fontSize = 14.sp,
                                        fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                                        color = if (isActive) ColorPrimary else ColorText
                                    )
                                }
                            },
                            onClick = { vm.seleccionarCategoria(cat.id); catMenuOpen = false }
                        )
                    }
                }
            }

            /* Con stock chip */
            FilterChipItem(
                label = "Con stock",
                active = soloStock,
                onClick = { vm.soloConStock.value = !soloStock; vm.irAPagina(1) }
            )

            Spacer(Modifier.weight(1f))

            Text(
                "${filteredProducts.size} prod.",
                color = ColorMuted,
                fontSize = 12.sp
            )
        }

        /* ── CONTENT ── */
        when (val state = uiState) {
            is CatalogoUiState.Loading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = ColorPrimary)
                        Spacer(Modifier.height(12.dp))
                        Text("Cargando productos...", color = ColorMuted, fontSize = 14.sp)
                    }
                }
            }
            is CatalogoUiState.Error -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(32.dp)
                    ) {
                        Text("⚠️", fontSize = 48.sp)
                        Spacer(Modifier.height(16.dp))
                        Text("No se pudo conectar", fontWeight = FontWeight.Bold, fontSize = 17.sp, color = ColorText)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            state.message,
                            color = ColorMuted,
                            fontSize = 12.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                        Spacer(Modifier.height(20.dp))
                        Button(
                            onClick = { vm.cargarProductos() },
                            colors = ButtonDefaults.buttonColors(containerColor = ColorPrimary)
                        ) {
                            Icon(Icons.Default.Refresh, null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Reintentar")
                        }
                    }
                }
            }
            is CatalogoUiState.Success -> {
                if (filteredProducts.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("📦", fontSize = 48.sp)
                            Spacer(Modifier.height(12.dp))
                            Text("Sin resultados", color = ColorMuted, fontSize = 14.sp)
                            if (activeCatId != null || search.isNotEmpty()) {
                                Spacer(Modifier.height(12.dp))
                                OutlinedButton(
                                    onClick = { vm.seleccionarCategoria(null); vm.searchQuery.value = "" },
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = ColorPrimary)
                                ) { Text("Quitar filtros") }
                            }
                        }
                    }
                } else {
                    Column(modifier = Modifier.fillMaxSize()) {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(10.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            items(pageData, key = { it.id }) { producto ->
                                ProductoCard(producto)
                            }
                        }
                        if (totalPags > 1) {
                            PaginationBar(
                                current        = currentPage,
                                total          = totalPags,
                                filteredCount  = filteredProducts.size,
                                pageSize       = vm.pageSize,
                                onPrev         = { vm.irAPagina(currentPage - 1) },
                                onNext         = { vm.irAPagina(currentPage + 1) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FilterChipItem(label: String, active: Boolean, onClick: () -> Unit) {
    val bg     = if (active) ColorPrimary else ColorSurface
    val border = if (active) ColorPrimary else ColorBorder
    val text   = if (active) Color.White  else ColorMuted
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(99.dp))
            .background(bg)
            .border(1.5.dp, border, RoundedCornerShape(99.dp))
            .padding(horizontal = 12.dp, vertical = 5.dp)
            .then(Modifier.clickableNoRipple { onClick() }),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (active) Icon(Icons.Default.CheckCircle, contentDescription = null, tint = text, modifier = Modifier.size(14.dp))
        Spacer(Modifier.width(4.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = text)
    }
}

@Composable
fun ProductoCard(producto: Producto) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = ColorSurface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            /* Image */
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
                    .clipToBounds()
                    .background(ColorBg),
                contentAlignment = Alignment.Center
            ) {
                if (!producto.imagenUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = producto.imagenUrl,
                        contentDescription = producto.nombre,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                    )
                } else {
                    Text("📦", fontSize = 40.sp)
                }
            }
            /* Body */
            Column(modifier = Modifier.padding(10.dp)) {
                Text(
                    producto.nombre,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = ColorText,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "S/ ${"%.2f".format(producto.precioBase)}",
                    fontSize = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = ColorPrimary
                )
                Text(
                    if (producto.tipoVenta == "por_peso") "Por peso / kg" else "Por unidad",
                    fontSize = 11.sp,
                    color = ColorMuted
                )
                Spacer(Modifier.height(6.dp))
                StockBadge(producto.stock)
            }
        }
    }
}

@Composable
fun StockBadge(stock: Int) {
    val bg    = when { stock > 5 -> Color(0xFFDCFCE7); stock > 0 -> Color(0xFFFEF3C7); else -> Color(0xFFFEE2E2) }
    val color = when { stock > 5 -> Color(0xFF15803D); stock > 0 -> Color(0xFF92400E); else -> Color(0xFFB91C1C) }
    val label = if (stock > 0) "Stock: $stock" else "Sin stock"
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(99.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
fun PaginationBar(
    current: Int,
    total: Int,
    filteredCount: Int,
    pageSize: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit
) {
    val rangeStart = (current - 1) * pageSize + 1
    val rangeEnd   = minOf(current * pageSize, filteredCount)
    val btnColors  = ButtonDefaults.outlinedButtonColors(contentColor = ColorPrimary)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(ColorSurface)
            .border(width = 1.dp, color = ColorBorder, shape = RoundedCornerShape(0.dp))
            .padding(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        OutlinedButton(
            onClick = onPrev,
            enabled = current > 1,
            colors = btnColors,
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
        ) {
            Text("‹ Anterior", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                "$current / $total",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = ColorText
            )
            Text(
                "$rangeStart–$rangeEnd de $filteredCount",
                fontSize = 11.sp,
                color = ColorMuted
            )
        }

        OutlinedButton(
            onClick = onNext,
            enabled = current < total,
            colors = btnColors,
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
        ) {
            Text("Siguiente ›", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

fun Modifier.clickableNoRipple(onClick: () -> Unit): Modifier = composed {
    val interactionSource = remember { MutableInteractionSource() }
    clickable(indication = null, interactionSource = interactionSource, onClick = onClick)
}